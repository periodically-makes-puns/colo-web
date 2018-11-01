/* jshint esversion: 6 */

const fs = require("fs");
const Discord = require("discord.js");
const Random = require("random-js");
var mt = Random.engines.mt19937();
const sgen = require("./screengen.js");
const SQLite = require("better-sqlite3");
var data = new SQLite("./mtwow/mtwow.sqlite");

var getStatus = data.prepare("SELECT current FROM Status;");
var getResps = data.prepare("SELECT * FROM Responses WHERE userid = @userid ORDER BY respNum;");
var getRespById = data.prepare("SELECT * FROM Responses WHERE id = @id;");
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
var numContestants = data.prepare("SELECT count(*) FROM Contestants;");
var modResponses = data.prepare("UPDATE Contestants SET numResps = @numResps WHERE userid = @userid;");
var modSpell = data.prepare("UPDATE Contestants SET spell = @spell WHERE userid = @userid;");
var deleteResponse = data.prepare("DELETE FROM Responses WHERE userid = @userid AND respNum = @respNum;");
var begin = data.prepare("BEGIN;");
var commit = data.prepare("COMMIT;");
var rollback = data.prepare("ROLLBACK;");


const filter = (arr, func) => {
  let otp = [];
  for (let i = 0; i < arr.length; i++) {
    if (func(arr[i], i, arr)) {
      otp.push(arr[i]);
    }
  }
  return otp;
};

function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function rolecheck(client, contestantData) {
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
}

module.exports = async (client, msg) => {
  args = msg.content.split(/[\^\s]+/g);
  log = client.channels.get("480897127262715924");
  clog = client.channels.get("502927473382653952");
  clog.send(`${msg.author.username} sent in ${(msg.channel.type == 'dm') ? "DMs" : 'channel with name ' + msg.channel.name}:\n\`\`\`${msg.content}\`\`\``);
  begin.run();
  // args[0] is empty, args[1] has command, args[2]+ are arguments to the command
  try {
    switch (args[1]) {
      case "help":

        if (!args[2]) {
          otp = new Discord.RichEmbed()
          .setTitle("mTWOW General Help")
          .setColor(0X3DAEFF)
          .setTimestamp(new Date())
          .setFooter("Contact PMP#5728 for any and all issues.")
          .addField("Commands", "help *[command]*\nsignup\nrespond [response number] [response]\nvote **[vote]** [vote number]\nresponseinfo\nvotetracker\naddresp\nsubresp\nsite\nscreen [vote number]\nvoteinfo")
          .addField("Example", "m^help")
          .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
          .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
        } else {
          console.log(args)
          otp = "";
          switch (args[2]) {
            case "help":
              otp = new Discord.RichEmbed()
              .setTitle("...seriously?")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^help *[command]*")
              .addField("Arguments", "command: The command you wish to obtain help for. If none is given, gives mTWOW General Help.")
              .addField("Effect", "User receives the requested help message.")
              .addField("Example", "m^help signup")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "signup":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW SIGNUP Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^signup")
              .addField("Arguments", "None.")
              .addField("Effect", "User signs up for the mTWOW.")
              .addField("Example", "m^signup")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "respond":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW RESPOND Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^respond [response number] [response]")
              .addField("Arguments", "response number: Indicates which response you wish to submit.\nresponse: The response you wish to submit.")
              .addField("Effect", "User sends in response [response number] as [response]. ONLY WORKS IN DMs.")
              .addField("Examples", "m^respond 1 This is my first response!\nm^respond 2 This is my second response!")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "vote":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW VOTE Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^vote **[vote]** *[vote number]*")
              .addField("Arguments", "vote: Your vote for the screen in question.\nvote number: Indicates the screen being voted on. If not given, defaults to current screen.")
              .addField("Effect", "User sends in vote [vote] for their screen number [vote number]")
              .addField("Example", "m^vote ABCDEFHIJG 1")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "responseinfo":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW RESPONSEINFO Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^responseinfo")
              .addField("Arguments", "None.")
              .addField("Effect", "User receives summary of their responses.")
              .addField("Example", "m^responseinfo")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "votetracker":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW VOTETRACKER Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^votetracker")
              .addField("Arguments", "None.")
              .addField("Effect", "User receives summary of their votes.")
              .addField("Example", "m^votetracker")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "addresp":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW ADDRESP Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^addresp")
              .addField("Arguments", "None.")
              .addField("Effect", "User increments their response count in return for losing lives.")
              .addField("Example", "m^addresp")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "subresp":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW SUBRESP Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^subresp")
              .addField("Arguments", "None.")
              .addField("Example", "m^subresp")
              .addField("Effect", "User decrements their response count in return for receiving lives.")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "site":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW SITE Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^site")
              .addField("Arguments", "None.")
              .addField("Effect", "User obtains link to website. Site can be found at https://www.pmpuns.com.")
              .addField("Example", "m^site")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            case "voteinfo":
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW VOTEINFO Command")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Usage", "m^voteinfo")
              .addField("Arguments", "None.")
              .addField("Effect", "User receives summary of their vote seeds and letters.")
              .addField("Example", "m^voteinfo")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
              break;
            default:
              otp = new Discord.RichEmbed()
              .setTitle("mTWOW General Help")
              .setColor(0X3DAEFF)
              .setTimestamp(new Date())
              .setFooter("Contact PMP#5728 for any and all issues.")
              .addField("Commands", "help *[command]*\nsignup\nrespond [response number] [response]\nvote **[vote]** *[vote number]*\nresponseinfo\nvotetracker\naddresp\nsubresp\nsite")
              .addField("Example", "m^help")
              .addField("Notation", "Brackets mean arguments.\nItalicised arguments mean optional.\nBolded arguments mean required except for first time.")
              .addField("Prefixes", "User prefixes are always ^ or m^, with m^ being mTWOW commands.\nAdmin prefixes are always & or m& with m& being mTWOW admin commands.");
          }
        }
        msg.channel.send({content: "Here ya go!", embed: otp});
        break;
      case "signup":
        contestantData = getContestantData.get({userid: msg.author.id});
        if (getStatus.get().current != "signups" && getStatus.get().current != "responding") {
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
            contestantData = getContestantData.get({userid: msg.author.id});
            client.guilds.get("439313069613514752").members.get(contestantData.userid).addRole("481831093964636161");
            rolecheck(client, contestantData);
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
          client.guilds.get("439313069613514752").members.get(msg.author.id).addRole("481831093964636161");
          log.send(`${msg.author.username} signed up! There are now ${numContestants.get()["count(*)"]} contestants!`);
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
        rolecheck(client, contestantData);
        respNum = parseInt(args[2]);
        if (isNaN(respNum)) {
          msg.channel.send("That's no number, that's a String!")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
          break;
        }
        if (respNum > contestantData.numResps || respNum < 0) {
          msg.channel.send("You don't have that many responses!")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
          break;
        }
        if(respNum < 1) {
          msg.channel.send("Uh, you know that response number is less than one, right?")
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
        console.log(contestantData);
        rolecheck(client, contestantData);
        inds = data.prepare("SELECT respNum FROM Responses WHERE userid = @userid;").all({userid: msg.author.id});
        inds.forEach((val, ind, arr) => {
          arr[ind] = val.respNum;
        });
        msg.channel.send(`Your response has been recorded. This is response index ${respNum}. You have sent ${contestantData.subResps} of your ${contestantData.numResps} responses. You have sent in responses with these indices: ${inds.join(", ")}.\n\nYour response was recorded as:\n\n${response.join(" ")}\n\nIt will be counted as ${response.length} words.`);
        log.send(`${client.users.get(msg.author.id).username}'s response has been recorded. This is response index ${respNum}. They have sent ${contestantData.subResps} of their ${contestantData.numResps} responses. They have sent in responses with these indices: ${inds.join(", ")}.\n\nTheir response was recorded as:\n\n${response.join(" ")}\n\nIt will be counted as ${response.length} words`)
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
        var screen;
        voterData = getVoterData.get({userid: msg.author.id});
        contestantData = getContestantData.get({userid: msg.author.id});
        seeds = getVoteSeeds.all({userid: msg.author.id});
        if (!voterData) {
          addVoter.run({userid: msg.author.id});
        }
        voterData = getVoterData.get({userid: msg.author.id});
        if (seeds.length == 0) {
          var gseed;
          mt.autoSeed();
          seed = Random.integer(1, 11881376)(mt);
          mt.seed(seed);
          if (!voterData) addVoter.run({userid: msg.author.id}); 
          if (contestantData) {
            voterData = getVoterData.get({userid: msg.author.id});
            if (voterData.voteCount < contestantData.subResps) {
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
          msg.channel.send(`This is screen number ${voterData.voteCount+1}.\n\n${screen}\n\n`);
        } else {
          vseed = parseInt(args[3]) - 1;
          if (isNaN(parseInt(args[3])) || parseInt(args[3]) > seeds.length || parseInt(args[3]) < 1) {
            msg.channel.send("Your screen number is invalid. Mind checking that out?")
            .then(msg => {sent = msg;})
            .catch(console.error);
            setTimeout(() => {
              sent.delete();
            }, 10000);
            break;
          }
          screen = sgen(seeds[parseInt(args[3]) - 1].seed, "internal");

          if (!args[2]) {
            msg.channel.send("Are you missing your vote? You need a vote.");
            msg.channel.send(`Just to clarify, this is the screen you're voting on:\n\n${sgen(seeds[vseed].seed, "text")}`);
            return;
          }
          used = [false, false, false, false, false, false, false, false, false, false];
          if (args[2].length != screen.length) {
            msg.channel.send("Sorry, no incomplete votes allowed.");
            return;
          }
          for (i = 0; i < args[2].length; i++) {
            if ((args[2].charCodeAt(i) - 65 < 0) || (args[2].charCodeAt(i) - 65 >= screen.length)) {
              msg.channel.send("An invalid character has been detected in your vote.");
              return;
            } else if (used[args[2].charCodeAt(i) - 65]) {
              msg.channel.send("A repeated character has been detected in your vote.");
              return;
            }
            used[args[2].charCodeAt(i) - 65] = true;
          }
          editVote.run({userid: msg.author.id, voteNum: vseed + 1, vote: args[2]});
          msg.channel.send(`Your vote of ${args[2]} on screen number ${vseed + 1} has been recognised.`);
          if (vseed == seeds.length - 1) {
            let gseed;
            editVoteCount.run({userid: msg.author.id, voteCount: voterData.voteCount + 1});
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
	      mt.autoSeed();
	      seed = Random.integer(1, 11881376)(mt);
	      mt.seed(seed);
              gseed = `${seed}`;
            }
            screen = sgen(gseed, "text");
            addVoteSeed.run({userid: msg.author.id, voteNum: voterData.voteCount + 2, seed: gseed});
            msg.channel.send(`This is screen number ${voterData.voteCount+2}.\n\n${screen}\n\n`);
          }
        }
        break;
      case "screen":
        if (msg.channel.type != 'dm') {
          msg.delete();
          msg.channel.send("Oi, take this into DMs, please.")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
          break;
        }
        seeds = getVoteSeeds.all({userid: msg.author.id});
        if (seeds.length == 0) {
          msg.channel.send("You haven't requested a screen yet.");
          break;
        }
        if (args[2]) {
          if (isNaN(parseInt(args[2])) || parseInt(args[2]) > seeds.length || parseInt(args[2]) < 1) {
            msg.channel.send("Your screen number is invalid.")
            .then(msg => {sent = msg;})
            .catch(console.error);
            setTimeout(() => {
              sent.delete();
            }, 10000);
            break;
          }
          screen = sgen(seeds[parseInt(args[2]) - 1].seed, "text");
        } else {
          screen = sgen(seeds[seeds.length - 1].seed, "text");
          vseed = seeds.length - 1;
        }
        msg.channel.send(screen);
        break;
      case "responseinfo":
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
        contestantData = getContestantData.get({userid: msg.author.id});
        if (!contestantData) {
          msg.channel.send("You're not a contestant.")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
        }
        responses = getResps.all({userid: msg.author.id});
        if (!responses) {
          responses = [];
        }
        otp = "";
        for (i = 1; i <= contestantData.numResps; i++) {
          ind = responses.findIndex((val) => {
            return val.respNum == i; 
          });
          if (ind != -1) {
            otp += `Response ${i}: \`\`${responses[ind].response}\`\`. Word count: ${responses[ind].words}.\n`;
          } else {
            otp += `Response ${i}: None.\n`;
          }
        }
        msg.channel.send(otp);
        break;
      case "voteinfo":
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
        voterData = getVoterData.get({userid: msg.author.id});
        votes = getVotes.all({userid: msg.author.id});
        if (votes.length == 0) {
          msg.channel.send("Should probably request a screen before you come here, neh?");
          break;
        }
        otp = "```\n";
        maxlen = 0
        for (i = 0; i < votes.length; i++) {
          maxlen = Math.max(votes[i].seed.toString().length, maxlen);
        }
        votes.forEach((val, ind, arr) => {
          ne = `${(ind + 1).toString().padStart(arr.length.toString().length, " ")}| Seed: ${val.seed.toString().padStart(maxlen, " ") } | Vote: ${val.vote}\n`;
          if (otp.length + ne.length + "```".length > 2000) {
            msg.channel.send(otp + "```");
            otp = "```\n";
          }
          otp += ne;
        });
        msg.channel.send(otp + "```");
        break;
      case "votetracker":
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
        voterData = getVoterData.get({userid: msg.author.id});
        if (!voterData || voterData.voteCount == 0) {
          msg.channel.send("No votes submitted. Please submit a vote before coming back.");
          return;
        }
        votes = getVotes.all({userid: msg.author.id});
        numResps = data.prepare("SELECT COUNT(*) AS count FROM Responses;").get().count;
        scores = new Array(numResps);
        for (i = 0; i < numResps; i++) {
          scores[i] = [];
        }
        
        votes.forEach((val) => {
          screen = sgen(val.seed, "internal");
          if (val.vote) {
            for (i = 0; i < val.vote.length; i++) {
              scores[screen[val.vote.charCodeAt(i) - 65] - 1].push((val.vote.length - i - 1) / (val.vote.length - 1));
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
            } else {
              tot = (tot * 100).toFixed(2) + "%";
            }
          } catch (e) {
            tot = "NONE";
          }
          scores[ind] = [ind, tot];
        });
        scores.sort((a, b) => {
          if (a[1] == "NONE") {
            if (b[1] == "NONE") {
              return 0;
            }
            return 1;
          }
          if (b[1] == "NONE") {
            return -1;
          }
          return parseFloat(b[1].substring(0, b[1].length - 1)) - parseFloat(a[1].substring(0, a[1].length - 1));
        });
        respMax = 0;
        percMax = 0;
        for (i = 0; i < scores.length; i++) {
          resp = getRespById.get({id: scores[i][0] + 1});
          scores[i] = [resp.response, scores[i][1]];
          respMax = Math.max(respMax, resp.response.length);
          percMax = Math.max(percMax, scores[i][1].length);
        }
        out = "```\n"
        out += "-".repeat(respMax + percMax + 3) + "\n";
        for (i = 0; i < scores.length; i++) {
          portion = "|";
          portion += scores[i][0] + " ".repeat(respMax - scores[i][0].length);
          portion += "|";
          portion += scores[i][1] + " ".repeat(percMax - scores[i][1].length);
          portion += "|\n";
          if (out.length + portion.length + respMax + percMax + 7 > 2000) {
            out += "-".repeat(respMax + percMax + 3) + "\n```"
            msg.channel.send(out);
            out = "```\n"
            out += "-".repeat(respMax + percMax + 3) + "\n";
          }
          out += portion;
        }
        out += "-".repeat(respMax + percMax + 3) + "\n```"
        msg.channel.send(out);
        break;
      case "website":
        msg.channel.send("https://www.pmpuns.com");
        break;
      case "site":
        msg.channel.send("https://www.pmpuns.com");
        break;
      case "addresp":
        contestantData = getContestantData.get({userid: msg.author.id});
        status = getStatus.get().current;
        if (status != "signups" && status != "responding") {
          msg.channel.send("It is not currently time for this.");
          return;
        }
        if (!contestantData) {
          msg.channel.send("You aren't signed up yet. Sign up first.");
          return;
        }
        spent = 1;
        if ((contestantData.lives - contestantData.spell) < spent) {
          msg.channel.send("You can't drop your life count under zero for extra responses.");
          return;
        } else {
          modSpell.run({userid: msg.author.id, spell: contestantData.spell + spent});
          modResponses.run({userid: msg.author.id, numResps: contestantData.numResps + 1});
          contestantData.numResps++;
          rolecheck(client, contestantData);
          msg.channel.send(`Done. You now have ${contestantData.numResps} responses and ${contestantData.lives - contestantData.spell - spent} lives.`);
        }
        break;
      case "subresp":
        contestantData = getContestantData.get({userid: msg.author.id});
        status = getStatus.get().current;
        if (status != "signups" && status != "responding") {
          msg.channel.send("It is not currently time for this.");
          return;
        }
        if (!contestantData) {
          msg.channel.send("You aren't signed up yet. Sign up first.");
          return;
        }
        spent = 1;
        if (contestantData.numResps <= 1) {
          msg.channel.send("You can't send less than one response.");
          return;
        }
        modSpell.run({userid: msg.author.id, spell: contestantData.spell - spent});
        modResponses.run({userid: msg.author.id, numResps: contestantData.numResps - 1});
        deleteResponse.run({userid: msg.author.id, respNum: contestantData.numResps});
        msg.channel.send(`Done. You now have ${contestantData.numResps - 1} responses and ${contestantData.lives - contestantData.spell + spent} lives. Your response with number ${contestantData.numResps} was deleted.`);
        break;
    }
    console.log(commit.run());
  } catch (e) {
    msg.channel.send("WHOOPS! I dropped your edits, sorry... It's just an error, PMP will help me out!");
    console.error(e);
  } finally {
    if (data.inTransaction) {
      console.log("rolled back");
      rollback.run();
    }
  }
};
