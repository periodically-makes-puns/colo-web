/* jshint esversion: 6 */
const fs = require("fs");
const Random = require("random-js");
var mt = Random.engines.mt19937();
const sgen = require("./screengen.js");
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
var numContestants = data.prepare("SELECT count(*) FROM Contestants;")

const filter = (arr, func) => {
  let otp = [];
  for (let i = 0; i < arr.length; i++) {
    if (func(arr[i], i, arr)) {
      otp.push(arr[i]);
    }
  }
  return otp;
};

module.exports = (client, msg) => {
  args = msg.content.split(/[\^\s]+/g);
  log = client.channels.get("480897127262715924");
  // args[0] is empty, args[1] has command, args[2]+ are arguments to the command
  switch (args[1]) {
    case "signup":
      contestantData = getContestantData.get({userid: msg.author.id});
      if (getStatus.get().current != "signups") {
        msg.channel.send("Sorry, but you can't sign up right now. Maybe later?")
        .then(msg => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
        }, 10000);
      } else {
        if (contestantData) {
          msg.channel.send("Sorry, but you've already signed up!")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
        } else {
          addContestant.run({userid: msg.author.id, subResps: 0, numResps: 1});
          msg.channel.send("Signed up!")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
          log.send(`${msg.author.username} signed up! There are now ${numContestants.get()["count(*)"]} contestants!`);
        }
      }
      break;
    case "respond":
      contestantData = getContestantData.get({userid: msg.author.id});
      responses = getResps.all({userid: msg.author.id}) || [];
      if (getStatus.get().current != "responding") {
        msg.channel.send("Not time to respond yet.")
        .then(msg => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
        }, 10000);
        break;
      }
      if (msg.channel.type != "dm") {
        msg.delete();
        msg.channel.send("Oi, take this into DMs, please.")
        .then(msg => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
        }, 10000);
        break;
      }
      if (!contestantData) {
        addContestant.run({userid: msg.author.id, subResps: 0, numResps: 1});
        
        /*
        msg.channel.send("You're no contestant! Get out!")
        .then(msg => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
          msg.delete();
        }, 10000);
        break;
        */
      }
      contestantData = getContestantData.get({userid: msg.author.id});
      respNum = parseInt(args[2]);
      if (respNum > contestantData.numResps) {
        msg.channel.send("You don't have that many responses!")
        .then(msg => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
        }, 10000);
        break;
      }
      response = args.slice(3);
      resp = responses.findIndex((val) => {
        return val.respNum == respNum;
      });
      if (resp == -1) {
        addResponse.run({userid: msg.author.id, respNum: respNum, response: response.join(" "), wc: response.length});
        editSubResps.run({userid: msg.author.id, subResps: contestantData.subResps + 1});
        contestantData.subResps++;
      } else {
        editResponse.run({userid: msg.author.id, respNum: respNum, response: response.join(" "), wc: response.length});
      }
      if (contestantData.subResps == contestantData.numResps) {
        if (client.guilds.get("439313069613514752").members.get(msg.author.id).roles.has("481812129096138772")) {
          client.guilds.get("439313069613514752").members.get(msg.author.id).removeRole("481812129096138772");
        }
        if (client.guilds.get("439313069613514752").members.get(msg.author.id).roles.has("481812076050907146")) {
          client.guilds.get("439313069613514752").members.get(msg.author.id).removeRole("481812076050907146");
        }
      } else if (contestantData.subResps > 0) {
        if (client.guilds.get("439313069613514752").members.get(msg.author.id).roles.has("481812076050907146")) {
          client.guilds.get("439313069613514752").members.get(msg.author.id).removeRole("481812076050907146");
        }
      }
      inds = data.prepare("SELECT respNum FROM Responses WHERE userid = @userid;").all({userid: msg.author.id})
      inds.forEach((val, ind, arr) => {
        arr[ind] = val.respNum;
      });
      msg.channel.send(`Your response has been recorded. This is response index ${respNum}. You have sent ${contestantData.subResps} of your ${contestantData.numResps} responses. You have sent in responses with these indices: ${inds.join(", ")}.\n\nYour response was recorded as:\n\n${response.join(" ")}\n\nIt will be counted as ${response.length} words`);
      break;
    case "vote":
      if (getStatus.get().current != "voting") {
        msg.channel.send("Sorry, but it's not yet voting time.")
        .then((msg) => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
        }, 10000);
        break;
      }
      var screen;
      voterData = getVoterData.get({userid: msg.author.id});
      contestantData = getContestantData.get({userid: msg.author.id});
      seeds = getVoteSeeds.all({userid: msg.author.id});
      if (!voterData) {
        addVoter.run({userid: msg.author.id});
      }
      voterData = getVoterData.get({userid: msg.author.id});
      if (!seeds) {
        var gseed;
        mt.autoSeed();
        seed = Random.integer(1, 11881376)(mt);
        mt.seed(seed);
        if (!voterData) addVoter.run({userid: msg.author.id}); 
        if (contestantData) {
          voterData = getVoterData.get({userid: msg.author.id});
          if (voterData.voteCount < contestatntData.subResps) {
            voterData = getVoterData.get({userid: msg.author.id});
            gseed = `${seed}-${msg.author.id}-${voterData.voteCount+1}`;
            screen = sgen(gseed, "text");
          } else {
            gseed = `${seed}`;
            screen = sgen(gseed, "text");
          }
        } else {
          gseed = `${seed}`;
          screen = sgen(gseed, "text");
        }
        addVoteSeed.run({userid: msg.author.id, voteNum: voterData.voteCount+1, seed: gseed});
        msg.channel.send(`This is screen number ${json.voteCount[msg.author.id]+1}.\n\n${screen}\n\n`);
      } else {
        if (args[3]) {
          screen = sgen(seeds[parseInt(args[3]) - 1], "internal");
        } else {
          screen = sgen(seeds[seeds.length - 1], "internal");
        }
        voteNum = parseInt(args[3]) || voterData.voteCount + 1;
        if (!args[2]) {
          msg.channel.send("Are you missing your vote? You need a vote.");
          msg.channel.send(`Just to clarify, this is the screen you're voting on:\n\n${sgen(seeds[voteNum], "text")}`);
          return;
        }
        used = [false, false, false, false, false, false, false, false, false, false];
        for (i = 0; i < args[2].length; i++) {
          if ((args[2].charCodeAt(i) - 65 < 0) || (args[2].charCodeAt(i) - 65 > screen.length)) {
            msg.channel.send("An invalid character has been detected in your vote.");
            return;
          } else if (used[args[2].charCodeAt(i) - 65]) {
            msg.channel.send("A repeated character has been detected in your vote.");
            return;
          }
        }
        editVote.run({userid: msg.author.id, voteNum: voteNum, vote: args[2]});
        msg.channel.send(`Your vote of ${args[2]} on screen number ${voteNum} has been recognised.`);
        if (voteNum == voterData.voteCount + 1) {
          editVoteCount.run({userid: msg.author.id, voteCount: voterData.voteCount + 1});
          gseed;
          if (contestantData) {
            mt.autoSeed();
            seed = Random.integer(1, 11881376)(mt);
            mt.seed(seed);
            if (voterData.voteCount + 1 < contestantData.subResps) {
              gseed = `${seed}-${msg.author.id}-${voterData.voteCount + 2}`;
            } else {
              gseed = `${seed}`;
            }
          } else {
            gseed = `${seed}`;
          }
          screen = sgen(gseed, "text");
          addVoteSeed.run({userid: msg.author.id, voteNum: voterData.voteCount + 2, seed: gseed});
          msg.channel.send(`This is screen number ${voterData.voteCount+1}.\n\n${screen}\n\n`);
        }
      }
  }
};