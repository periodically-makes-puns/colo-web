/* jshint esversion: 6 */
const fs = require("fs");
const SQLite = require("better-sqlite3");
var data = new SQLite("./mtwow/mtwow.sqlite");
var getStatus = data.prepare("SELECT current FROM Status;");
var getResps = data.prepare("SELECT * FROM Responses WHERE userid = @userid ORDER BY respNum;");
var getContestantData = data.prepare("SELECT * FROM Contestants WHERE userid = @userid;");
var getVoterData = data.prepare("SELECT * FROM Voters WHERE userid = @userid;");
var getVotes = data.prepare("SELECT * FROM Votes WHERE userid = @userid ORDER BY voteNum;");
var getVoteSeeds = data.prepare("SELECT seed FROM Votes WHERE userid = @userid ORDER BY voteNum;");
var getRespsOverWC = data.prepare("SELECT * FROM Responses WHERE userid = @userid AND words > 10;");
var addResponse = data.prepare("INSERT INTO Responses (userid, respNum, response, words) VALUES (@userid, @respNum, @response, @wc);");
var addVoteSeed = data.prepare("INSERT INTO Votes (userid, voteNum, seed) VALUES (@userid, @voteNum, @seed);");
var editVote = data.prepare("UPDATE Votes SET vote = @vote WHERE userid = @userid AND voteNum = @voteNum;");
var editResponse = data.prepare("UPDATE Responses SET response = @response, words = @wc WHERE userid = @userid AND respNum = @respNum;");
var editVoteCount = data.prepare("UPDATE Voters SET voteCount = @voteCount WHERE userid = @userid;");
var editSubResps = data.prepare("UPDATE Contestants SET subResps = @subResps WHERE userid = @userid;");
var addContestant = data.prepare("INSERT INTO Contestants (userid, subResps, numResps) VALUES (@userid, @subResps, @numResps);");
var addVoter = data.prepare("INSERT INTO Voters (userid, voteCount) VALUES (@userid, 0)");
//admin only
var changeStatus = data.prepare("UPDATE Status SET current = @status;");
var changePrompt = data.prepare("UPDATE Status SET prompt = @prompt;");
var getAllContestants = data.prepare("SELECT * FROM Contestants;");
var editNumResps = data.prepare("UPDATE Contestants SET numResps = @numResps WHERE userid = @userid;");
var killContestant = data.prepare("DELETE FROM Contestants WHERE userid = @userid;");
var removeResponse = data.prepare("DELETE FROM Votes WHERE id = @id;");

module.exports = async (client, msg) => {
  var args = msg.content.split(/[\^&\s]+/g);
  switch (args[1]) {
    case "status":
      changeStatus.run({status: args[2]});
      msg.channel.send(`Set status to ${args[2]}`);
      break;
    case "startresp":
      changeStatus.run({status: "responding"});
      let contestants = getAllContestants.all();
      for (let i = 0; i < contestants.length; i++) {
        try {
          await client.guilds.get("439313069613514752").members.get(contestants[i].userid).addRoles(["481812076050907146", "481812129096138772"], `Contestant ${i+1} of ${contestants.length}`);
          client.channels.get("480897127262715924").send(`Gave contestant ${client.users.get(contestants[i].userid).username} roles ${client.guilds.get("439313069613514752").roles.get("481812076050907146").name}, ${client.guilds.get("439313069613514752").roles.get("481812129096138772").name}`);
        } catch (e) {
          console.error(e);
          client.channels.get("480897127262715924").send(`⚠ <@262173579876106240> Contestant with ID ${contestants[i].userid} was not found! <@248953835899322370> ⚠`);
        }
      }
      json.prompt = msg.content.split("``")[1];
      break;
    case "startvote": 
      changeStatus.run({status: "voting"});
      let contestants = getAllContestants.all();
      for (let i = 0; i < contestants.length; i++) {
        try {
          const id = contestants[i].userid;
          const contestant = client.guilds.get("439313069613514752").members.get(id);
          if (contestant.roles.has("481812076050907146")) {
            client.channels.get("480897127262715924").send(`Contestant ${contestant.name} has DNPed. Revoking roles now.`);
            await contestant.removeRoles(["481812076050907146", "481812129096138772", "481831093964636161"]);
            await contestant.addRole("481831151674327042");
            killContestant.run({userid: id});
          } else if (contestant.roles.has("481812129096138772")) {
            client.channels.get("480897127262715924").send(`Contestant ${contestant.name} lost some responses. Revoking roles now.`);
            await contestant.removeRole("481812129096138772");
          } else {
            client.channels.get("480897127262715924").send(`Contestant ${contestant.name} fully responded.`);
          }
        } catch (e) {
          client.channels.get("480897127262715924").send(`⚠ <@262173579876106240> Something went wrong when updating contestant with ID ${contestants[i].userid}! <@248953835899322370> ⚠`);
        }
      }
    }
  fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
}
