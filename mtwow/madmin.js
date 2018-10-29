/* jshint esversion: 6 */
const Discord = require("discord.js");
const fs = require("fs");
const SQLite = require("better-sqlite3");
var data = new SQLite("./mtwow/mtwow.sqlite");
const sgen = require("./screengen.js");
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
var addContestant = data.prepare("INSERT INTO Contestants (userid, subResps, numResps, lives, spell) VALUES (@userid, @subResps, @numResps, 9, 0);");
var addVoter = data.prepare("INSERT INTO Voters (userid, voteCount) VALUES (@userid, 0)");
//admin only
var changeStatus = data.prepare("UPDATE Status SET current = @status;");
var changePrompt = data.prepare("UPDATE Status SET prompt = @prompt;");
var getAllContestants = data.prepare("SELECT * FROM Contestants;");
var getAllVotes = data.prepare("SELECT * FROM Votes ORDER BY userid;");
var editNumResps = data.prepare("UPDATE Contestants SET numResps = @numResps WHERE userid = @userid;");
var killContestant = data.prepare("DELETE FROM Contestants WHERE userid = @userid;");
var removeResponse = data.prepare("DELETE FROM Votes WHERE id = @id;");
var getAllResponses = data.prepare("SELECT * FROM Responses ORDER BY userid;");
var removeAllContestants = data.prepare("DELETE FROM Contestants;");
var removeAllResponses = data.prepare("DELETE FROM Responses;");
var removeAllVotes = data.prepare("DELETE FROM Votes;"); 
var removeAllVoters = data.prepare("DELETE FROM Voters;");
var editVoteNum = data.prepare("UPDATE Votes SET voteNum = @newVoteNum WHERE userid = @userid AND voteNum = @oldVoteNum;");
var nonNullVoteCount = data.prepare("SELECT COUNT(*) FROM Votes WHERE vote IS NOT NULL AND userid = @userid;");
var getAllVoters = data.prepare("SELECT * FROM Voters ORDER BY userid;");
var getRespById = data.prepare("SELECT * FROM Responses WHERE id = @id;");
var removeContestantResps = data.prepare("DELETE FROM Responses WHERE userid = @userid;");
var editId = data.prepare("UPDATE Responses SET id = @newid WHERE id = @oldid;");

var begin = data.prepare("BEGIN;");
var commit = data.prepare("COMMIT;");
var rollback = data.prepare("ROLLBACK;");
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}
function rolecheck(client, contestantData) {
  try {
    if (contestantData.subResps == contestantData.numResps) {
      if (client.guilds.get("439313069613514752").members.get(contestantData.userid).roles.has("481812129096138772")) {
        client.guilds.get("439313069613514752").members.get(contestantData.userid).removeRole("481812129096138772");
      }
      if (client.guilds.get("439313069613514752").members.get(contestantData.userid).roles.has("481812076050907146")) {
        client.guilds.get("439313069613514752").members.get(contestantData.userid).removeRole("481812076050907146");
      }
    } else if (contestantData.subResps > 0) {
      if (client.guilds.get("439313069613514752").members.get(contestantData.userid).roles.has("481812076050907146")) {
        client.guilds.get("439313069613514752").members.get(contestantData.userid).removeRole("481812076050907146");
      }
      if (!client.guilds.get("439313069613514752").members.get(contestantData.userid).roles.has("481812129096138772")) {
        client.guilds.get("439313069613514752").members.get(contestantData.userid).addRole("481812129096138772");
      }
    } else {
      if (!client.guilds.get("439313069613514752").members.get(contestantData.userid).roles.has("481812076050907146")) {
        client.guilds.get("439313069613514752").members.get(contestantData.userid).addRole("481812076050907146");
      }
      if (!client.guilds.get("439313069613514752").members.get(contestantData.userid).roles.has("481812129096138772")) {
        client.guilds.get("439313069613514752").members.get(contestantData.userid).addRole("481812129096138772");
      }
    }
  } catch (e) {
    client.channels.get("480897127262715924").send(`@PMPuns#5728 Weewoo! Contestant with ID ${contestantData.userid} not found!`);
  }
}

module.exports = async (client, msg) => {
  begin.run();
  try {
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
              // await contestant.addRole("481831151674327042");
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
        otp = ""
        resps.forEach((val, ind, arr) => {
          ne = `${client.users.get(val.userid).username} submitted \`\`${val.response}\`\` for response ${val.respNum}, which was counted as ${val.words} word${(val.words != 1) ? "s" : ""}.\n`
          if (ne.length + otp.length > 2000) {
            msg.channel.send(otp);
            otp = "";
          }
          otp += ne;
        });
        msg.channel.send(otp);
        break;
      case "listAllContestants":
        conts = getAllContestants.all();
        otp = "";
        conts.forEach((val, ind, arr) => {
          ne = `${client.users.get(val.userid).username}: ${val.subResps} of ${val.numResps}.\n`
          if (ne.length + otp.length > 2000) {
            msg.channel.send(otp);
            otp = "";
          }
          otp += ne;
        });
        break;
      case "correctContestantData":
        conts = getAllContestants.all();
        otp = ""
        conts.forEach((val, ind, arr) => {
          resps = getResps.all({userid: val.userid}) || [];
          editSubResps.run({userid: val.userid, subResps: resps.length});
          if (!client.users.get(val.userid)) {
            msg.channel.send(`Weewoo! User with ID ${val.userid} not found!`);
          } else {
            rolecheck(client, val);
            ne = `Contestant ${client.users.get(val.userid).username}'s number of responses was corrected to ${resps.length}.\n`
            if (otp.length + ne.length > 2000) {
              msg.channel.send(otp);
              otp = "";
            }
            otp += ne;
          }
        });
        msg.channel.send(otp);
        break;
      case "listAllVotes":
        votes = getAllVotes.all();
        votes.forEach((val, ind, arr) => {
          msg.channel.send(`${client.users.get(val.userid).username} voted on Screen ID ${val.seed} as vote number ${val.voteNum} with vote ${val.vote}.`);
        });
        break;
      case "SQLUpdate":
        try {
          data.prepare(args.slice(2).join(" ")).run();
        } catch (e) {
          console.error(e);
          msg.channel.send("Failed.");
        }
        msg.channel.send("Success.");
        break;
      case "SQLGet":
        try {
          sqlotp = data.prepare(args.slice(2).join(" ")).get();
          msg.channel.send(JSON.stringify(sqlotp));
        } catch (e) {
          console.error(e);
          msg.channel.send("Failed.");
        }
        break;
      case "correctVoterData":
        voters = data.prepare("SELECT userid FROM Voters;").all()
        voters.forEach((val) => {
          votes = getVotes.all({userid: val.userid});
          vc = nonNullVoteCount.run({userid: val.userid})
          for (i = 0; i < votes.length; i++) {
            if (votes[i].voteNum != i + 1) {
              editVoteNum.run({userid: val.userid, oldVoteNum: votes[i].voteNum, newVoteNum: i + 1});
            }
          }
          if (val.voteCount != vc) {
            editVoteCount.run({userid: val.userid, voteCount: vc});
          }
        });
        break;
      case "getResults":
        if (msg.channel.type != "dm" && msg.channel.id != "460585550676754452") {
          msg.delete();
          msg.channel.send("Oi, take this into DMs, please.")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
          break;
        }
        numResps = data.prepare("SELECT COUNT(*) AS count FROM Responses;").get().count;
        voters = getAllVoters.all();
        ascores = new Array(numResps);
        for (i = 0; i < numResps; i++) {
          ascores[i] = [];
        }
        voters.forEach((val, ind, arr) => {
          voterData = getVoterData.get({userid: val.userid});
          if (!voterData || voterData.voteCount == 0) {
            return;
          }
          votes = getVotes.all({userid: val.userid});
          scores = new Array(numResps);
          for (i = 0; i < numResps; i++) {
            scores[i] = [];
          }
          
          votes.forEach((val) => {
            screen = sgen(val.seed, "internal");
            if (val.vote) {
              for (i = 0; i < val.vote.length; i++) {
                try {
                  scores[screen[val.vote.charCodeAt(i) - 65] - 1].push((val.vote.length - i - 1) / (val.vote.length - 1));
                } catch (e) {
                  console.log(val.seed);
                  throw Error('HEfowiehgw');
                }
              }
            }
          });
          scores.forEach((val, ind) => {
            if (val.length != 0) { 
              tot = val.reduce((prev, curr) => {
                return prev + curr;
              });
            }
            try {
              tot /= val.length;
              if (isNaN(tot) || tot == Infinity) {
                tot = "NONE";
              }
            } catch (e) {
              tot = "NONE";
            }
            if (tot != "NONE") {
              ascores[ind].push(tot);
            }
          });
        });
        
        numResps = {};
        rank = 1;
        ascores.forEach((val, ind) => {
          response = getRespById.get({id: ind + 1});
          if (val.length != 0) { 
            tot = val.reduce((prev, curr) => {
              return prev + curr;
            });
            avg = tot / val.length;
            stdevtot = val.reduce((prev, curr) => {
              return prev + Math.pow(curr - avg, 2); 
            }) / val.length;
          }
          try {
            tot /= val.length;
            if (isNaN(tot) || tot == Infinity) {
              tot = "NONE";
              console.log(val);
              msg.channel.send("NO VOTES ON A RESPONSE! ABORT! ABORT!");
              throw new Error("No votes on a response!");
            }
          } catch (e) {
            tot = "NONE";
          }
          ascores[ind] = [ind, tot, stdevtot];
        });
        ascores.sort((a, b) => {
          return (b[1] - a[1] != 0) ? b[1] - a[1] : b[2] - a[2];
        });
        ascores.forEach((val, ind, arr) => {
          response = getRespById.get({id: val[0] + 1});
          if (numResps.hasOwnProperty(response.userid)) {
            numResps[response.userid]++;
          } else {
            numResps[response.userid] = 1;
          }
          if (numResps[response.userid] == 1) {
            arg1 = 0;
          } else {
            arg1 = "-";
          }
          ascores[ind] = [arg1, client.users.get(response.userid).username + `[${numResps[response.userid]}]`, response.response, 3, 0, val[1], val[2], val.length];
        });
        ascores.forEach((val, ind, arr) => {
          if (val[0] === 0) {
            val[0] = rank;
            rank++;
          }
          val[6] = (val[6] * 100).toFixed(2) + "%";
          val[5] = (val[5] * 100).toFixed(2) + "%";
          arr[ind] = val.join("\t");
        });
        otp = ascores.join("\n");
        fs.writeFile("/home/webadmin/Documents/app-new/mtwow/results/results.tsv", otp, "utf8", (err) => {
          if (err) {
            msg.channel.send("Write failed!");
            console.error(err);
            throw Error("Write failed");
          } else {
            msg.channel.send("Here are the results:", {files: [{
              attachment: 'mtwow/results/results.tsv',
              name: 'results.tsv'
           }]});
          }
        });
        break;
      case "nextRound":
        removeAllResponses.run();
        removeAllVotes.run();
        removeAllVoters.run();
        break;
      case "clear":
        removeAllContestants.run();
        removeAllResponses.run();
        removeAllVotes.run();
        removeAllVoters.run();
        break;
      case "addContestant":
        id = args[2];
        contestantData = getContestantData.get({userid: id});

        if (contestantData) {
          msg.channel.send("Sorry, but you've already signed up!")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
        } else {
          if (!client.users.get(id)) {
            msg.channel.send("This user cannot be found. Aborting.");
            break;
          }
          addContestant.run({userid: id, subResps: 0, numResps: 1});
          contestantData = getContestantData.get({userid: id});
          client.guilds.get("439313069613514752").members.get(contestantData.userid).addRole("481831093964636161");
          rolecheck(client, contestantData);
          msg.channel.send("Signed up!")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
          msg.channel.send(`Signed ${client.users.get(contestantData.userid).username} up!`)
        }
        break;
      case "removeContestant":
        id = args[2];
        removeContestantResps.run({userid: id});
        killContestant.run({userid: id});
        msg.channel.send("Removed.");
        break;
      case "addResponse":
        id = args[2];
        contestantData = getContestantData.get({userid: id});
        respNum = parseInt(args[3]);
        resps = getResps.all({userid: id});
        ind = resps.findIndex((val, ind, arr) => {
          return val.respNum == respNum;
        });
        response = args.slice(4).join(" ");
        wc = args.length - 4;
        if (ind == -1) {
          addResponse.run({userid: id, respNum: respNum, response: response, wc: wc});
          editSubResps.run({userid: id, subResps: contestantData.subResps + 1});
          contestantData.subResps++;
        } else {
          editResponse.run({userid: id, respNum: respNum, response: response, wc: wc});
        }
        rolecheck(client, contestantData);
        msg.channel.send("Done.");
        break;
      case "remindIn":
        subject = msg.content.split("``")[1];
        time = args[2].split(":");
        options = args[3].split(",");
        otp = ""
        if (options.indexOf("everyone") != -1) {
          otp += "@everyone\n";
        } else if (options.indexOf("here") != -1) {
          otp += "@here\n";
        }
        switch (time.length) {
          case 2:
            days = 0;
            hrs = parseInt(time[0]);
            mins = parseInt(time[1]);
            secs = 0;
            break;
          case 3:
            days = 0;
            hrs = parseInt(time[0]);
            mins = parseInt(time[1]);
            secs = parseInt(time[2]);
            break;
          case 4:
            days = parseInt(time[0]);
            hrs = parseInt(time[1]);
            mins = parseInt(time[2]);
            secs = parseInt(time[3]);
            break;
          default:
            msg.channel.send("? I didn't understand that.");
            break;
        }
        actual = days * 24 * 60 * 60 + hrs * 60 * 60 + mins * 60 + secs;
        msg.channel.send(`Got it; Set your reminder to \`\`${subject}\`\` in ${days} days, ${hrs} hours, ${mins} minutes, and ${secs} seconds.`);
        setTimeout(() => {
          client.channels.get("502931534660239380").send(otp + `ALERT: \n\`\`\`${subject}\`\`\``);
        }, actual * 1000);
        break;
      case "contestantinfo":
        id = args[2];
        contestantData = getContestantData.get({userid: id});
        responses = getResps.all({userid: id});
        if (!contestantData) {
          msg.channel.send("Contestant not found.");
          break;
        }
        msg.channel.send(JSON.stringify(contestantData));
        msg.channel.send(JSON.stringify(responses));
        break;
      case "correctIds":
        resps = data.prepare("SELECT * FROM Responses ORDER BY id;").all();
        resps.forEach((val, ind, arr) => {
          console.log(val.id);
          editId.run({oldid: val.id, newid: ind + 1});
        });
        break;
      default:
        msg.channel.send("...that's not a command.");
    }
    commit.run();
  } finally {
    if (data.inTransaction) rollback.run();
  }
}
