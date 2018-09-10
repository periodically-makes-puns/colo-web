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
var getAllResponses = data.prepare("SELECT * FROM Responses ORDER BY userid;");

module.exports = async (client, msg) => {
  var args = msg.content.split(/[\^&\s]+/g);
  switch (args[1]) {
    case "status":
      changeStatus.run({status: args[2]});
      msg.channel.send(`Set status to ${args[2]}`);
      break;
    case "startresp":
      changeStatus.run({status: "responding"});
      contestants = getAllContestants.all();
      for (i = 0; i < contestants.length; i++) {
        try {
          await client.guilds.get("439313069613514752").members.get(contestants[i].userid).addRoles(["481812076050907146", "481812129096138772"], `Contestant ${i+1} of ${contestants.length}`);
          client.channels.get("480897127262715924").send(`Gave contestant ${client.users.get(contestants[i].userid).username} roles ${client.guilds.get("439313069613514752").roles.get("481812076050907146").name}, ${client.guilds.get("439313069613514752").roles.get("481812129096138772").name}`);
        } catch (e) {
          console.error(e);
          client.channels.get("480897127262715924").send(`⚠ <@262173579876106240> Contestant with ID ${contestants[i].userid} was not found! <@248953835899322370> ⚠`);
        }
      }
      changePrompt.run({prompt: msg.content.split("``")[1]});
      break;
    case "startvote": 
      changeStatus.run({status: "voting"});
      contestants = getAllContestants.all();
      for (i = 0; i < contestants.length; i++) {
        try {
          id = contestants[i].userid;
          contestant = client.guilds.get("439313069613514752").members.get(id);
          if (contestants[i].subResps == 0) {
            client.channels.get("480897127262715924").send(`Contestant ${contestant.user.username} has DNPed. Revoking roles now.`);
            await contestant.removeRoles(["481812076050907146", "481812129096138772", "481831093964636161"]);
            await contestant.addRole("481831151674327042");
            killContestant.run({userid: id});
          } else if (contestants[i].subResps < contestants[i].numResps) {
            client.channels.get("480897127262715924").send(`Contestant ${contestant.user.username} lost some responses. Revoking roles now.`);
            await contestant.removeRole("481812129096138772");
          } else {
            client.channels.get("480897127262715924").send(`Contestant ${contestant.user.username} fully responded.`);
          }
        } catch (e) {
          console.error(e);
          client.channels.get("480897127262715924").send(`⚠ <@262173579876106240> Something went wrong when updating contestant with ID ${contestants[i].userid}! <@248953835899322370> ⚠`);
        }
      }
      break;
    case "giveResponses":
      id = args[2];
      respNums = parseInt(args[3]);
      editNumResps.run({userid: id, numResps: respNums});
      client.channels.get("480897127262715924").send(`Gave user with ID ${id} ${respNums} response${(respNums != 1) ? "s" : ""}`);
      break;
    case "listAllResps":
      resps = getAllResponses.all();
      resps.forEach((val, ind, arr) => {
        arr[ind] = `${client.users.get(val.userid).username} submitted \`\`${val.response}\`\` for response ${val.respNum}, which was counted as ${val.words} word${(val.words != 1) ? "s" : ""}.`; 
      });
      msg.channel.send(resps.join("\n"));
      break;
    case "listAllContestants":
      data = getAllContestants.all();
      data.forEach((val, ind, arr) => {
        arr[ind] = `${client.users.get(val.userid).username}: ${val.subResps} of ${val.numResps}.`;
      });
      msg.channel.send("```\n" + data.join("\n") + "\n```");
      break;
    case "correctContestantData":
      conts = getAllContestants.all()
      conts.forEach((val, ind, arr) => {
        resps = getResps.all({userid: val.userid}) || [];
        editSubResps.run({userid: val.userid, subResps: resps.length});
        msg.channel.send(`Contestant ${client.users.get(val.userid).username}'s number of responses was corrected to ${resps.length}.`);
      });
      break;
  }
}
