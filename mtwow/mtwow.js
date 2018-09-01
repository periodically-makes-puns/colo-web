/* jshint esversion: 6 */
const fs = require("fs");
const Random = require("random-js");
var mt = Random.engines.mt19937();
const sgen = require("./screengen.js");

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
  const log = client.channels.get("480897127262715924");
  const args = msg.content.split(/[\^\s]+/g);
  const data = fs.readFileSync("./mtwow/mtwow.json", "utf-8");
  const json = JSON.parse(data);
  // args[0] is empty, args[1] has command, args[2]+ are arguments to the command
  switch (args[1]) {
    case "signup":
      if (json.current != "signups") {
        msg.channel.send("Sorry, but you can't sign up right now. Maybe later?")
        .then(msg => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
          msg.delete();
        }, 10000);
      } else {
        if (json.contestants.indexOf(msg.author.id) != -1) {
          msg.channel.send("Sorry, but you've already signed up!")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
            msg.delete();
          }, 10000);
        } else {
          json.contestants.push(msg.author.id);
          json.respCount[msg.author.id] = 1;
          json.actualRespCount[msg.author.id] = 0;
          json.voteCount[msg.author.id] = 0;
          msg.channel.send("Signed up!")
          .then(msg => {sent = msg;})
          .catch(console.error);
          setTimeout(() => {
            sent.delete();
          }, 10000);
          log.send(`${msg.author.username} signed up! There are now ${json.contestants.length} contestants!`);
        }
      }
      break;
    case "respond":
      if (json.current != "responding") {
        msg.channel.send("Not time to respond yet.")
        .then(msg => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
          msg.delete();
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
      
      if (json.contestants.indexOf(msg.author.id) == -1) {
        json.contestants.push(msg.author.id);
        json.respCount[msg.author.id] = 1;
        json.actualRespCount[msg.author.id] = 0;
        json.voteCount[msg.author.id] = 0;
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
      
      const respNum = parseInt(args[2]);
      if (respNum > json.respCount[msg.author.id]) {
        msg.channel.send("You don't have that many responses!")
        .then(msg => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
          msg.delete();
        }, 10000);
        break;
      }
      const response = args.slice(3);
      const ind = json.responses.findIndex((cur) => {
        return cur[0] == msg.author.id && cur[1] == respNum;
      });
      if (ind == -1) {
        json.responses.push([msg.author.id, respNum, response.join(" "), response.length]);
        json.respCount[msg.author.id]++;
      } else {
        json.responses[ind] = [msg.author.id, respNum, response.join(" "), response.length];
      }
      var responses = filter(json.responses, (obj, ind, arr) => {
        return obj[0] == msg.author.id;
      });
      responses.forEach((obj, ind, arr) => {
        arr[ind] = obj[1];
      });
      msg.channel.send(`Your response has been recorded. This is response index ${respNum}. You have sent ${json.respCount[msg.author.id]} of your ${json.actualRespCount[msg.author.id]} responses. You have sent in responses with these indices: ${responses.join(", ")}.\n\nYour response was recorded as:\n\n${response.join(" ")}\n\nIt will be counted as ${response.length} words`);
      break;
    case "vote":
      if (json.current != "voting") {
        msg.channel.send("Sorry, but it's not yet voting time.")
        .then((msg) => {sent = msg;})
        .catch(console.error);
        setTimeout(() => {
          sent.delete();
        }, 10000);
        break;
      }
      let screen;
      if (!json.currentVoteScreen.hasOwnProperty(msg.author.id)) {
        let gseed;
        mt.autoSeed();
        let seed = Random.integer(1, 11881376)(mt);
        mt.seed(seed);
        json.voteCount[msg.author.id] = (json.voteCount[msg.author.id]) ? json.voteCount[msg.author.id] : 0;
        if (json.contestants.indexOf(msg.author.id) != -1) {
          if (json.voteCount[msg.author.id] < json.actualRespCount[msg.author.id]) {
            gseed = `${seed}-${msg.author.id}-${json.voteCount[msg.author.id]+1}`;
            screen = sgen(gseed, "text");
          } else {
            gseed = `${seed}`;
            screen = sgen(gseed, "text");
          }
        } else {
          gseed = `${seed}`;
          screen = sgen(gseed, "text");
        }
        json.currentVoteScreen[msg.author.id] = gseed;
        json.priorVoteScreens[msg.author.id] = [];
        fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
        msg.channel.send(`This is screen number ${json.voteCount[msg.author.id]+1}.\n\n${screen}\n\n`);
      } else {
        if (args[3]) {
          screen = sgen(json.priorVoteScreens[msg.author.id][parseInt(args[3]) - 1], "internal");
        } else {
          screen = sgen(json.currentVoteScreen[msg.author.id], "internal");
        }
        voteNum = parseInt(args[3]) || json.voteCount[msg.author.id] + 1;
        if (!args[2]) {
          msg.channel.send("Are you missing your vote? You need a vote.");
          msg.channel.send(`Just to clarify, this is your current screen:\n\n${sgen(json.currentVoteScreen[msg.author.id], "text")}`);
          return;
        }
        let used = [false, false, false, false, false, false, false, false, false, false];
        for (let i = 0; i < args[2].length; i++) {
          if ((args[2].charCodeAt(i) - 65 < 0) || (args[2].charCodeAt(i) - 65 > screen.length)) {
            msg.channel.send("An invalid character has been detected in your vote.");
            return;
          } else if (used[args[2].charCodeAt(i) - 65]) {
            msg.channel.send("A repeated character has been detected in your vote.");
            return;
          } else {
            used[args[2].charCodeAt(i) - 65] = (screen.length - i - 1) / (screen.length - 1);
          }
        }
        let cnt = 0;
        for (let i = 0; i < used.length; i++) {
          if (used[i] === false) {
            cnt++;
          }
        }
        for (let i = 0; i < used.length; i++) {
          if (used[i] === false) {
            used[i] = (cnt - 1) / 2 / (screen.length - 1);
          }
        }
        let otp = [msg.author.id, json.voteCount[msg.author.id] + 1, []];
        for (let i = 0; i < json.responses.length; i++) {
          otp[2].push(-1);
        }
        for (let i = 0; i < used.length; i++) {
          otp[2][screen[i]] = used[i];
        }
        json.votes.push(otp);
        json.voteCount[msg.author.id]++;
        let gseed;
        if (json.contestants.indexOf(msg.author.id) != -1) {
          mt.autoSeed();
          let seed = Random.integer(1, 11881376)(mt);
          mt.seed(seed);
          if (json.voteCount[msg.author.id] < json.actualRespCount[msg.author.id]) {
            gseed = `${seed}-${msg.author.id}-${json.voteCount[msg.author.id]+1}`;
            screen = sgen(gseed, "text");
          } else {
            gseed = `${seed}`;
            screen = sgen(gseed, "text");
          }
        } else {
          gseed = `${seed}`;
          screen = sgen(gseed, "text");
        }
        msg.channel.send(`Just to clarify, this was your previous screen:\n\n${sgen(json.currentVoteScreen[msg.author.id], "text")}`);
        json.priorVoteScreens[msg.author.id].push(json.currentVoteScreen[msg.author.id]);
        json.currentVoteScreen[msg.author.id] = gseed;
        msg.channel.send(`This is screen number ${json.voteCount[msg.author.id]+1}.\n\n${screen}\n\n`);
      }
      
  }
  fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
};