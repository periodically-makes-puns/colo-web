/* jshint esversion: 6 */
const fs = require("fs");
const Random = require("random-js");
const seeder = Random.engines.browserCrypto;
const mt = Random.engines.mt19937();

const filter = (arr, func) => {
  var otp = [];
  for (let i = 0; i < arr.length; i++) {
    if (func(arr[i], i, arr)) {
      otp.push(arr[i]);
    }
  }
  return otp;
};

module.exports = (client, msg) => {
  var args = msg.content.split(/[\^&\s]+/g);
  var data = fs.readFileSync("./mtwow/mtwow.json", "utf-8");
  var json = JSON.parse(data);
  const log = client.channels.get("480897127262715924");
  // args[0] is empty, args[1] has command, args[2]+ are arguments to the command
  switch (args[1]) {
    case "signup":
      if (json.current != "signup") {
        log.send(`${msg.author.username} tried to sign up, but couldn't!`);
        msg.channel.send("Sorry, but you can't sign up right now. Maybe later?")
          .then(msg => {sent = msg;})
          .catch(console.error);
        setTimeout(() => {
          msg.delete();
          sent.delete();
        }, 10000);
      } else {
        if (json.contestants.indexOf(msg.author.id) != -1) {
          log.send(`${msg.author.username} tried to sign up, but already had!`);
          msg.channel.send("Sorry, but you've already signed up!")
            .then(msg => {sent = msg;})
            .catch(console.error);
          setTimeout(() => {
            msg.delete();
            sent.delete();
          }, 10000);
        } else {
          json.contestants.push(msg.author.id);
          json.respCount[msg.author.id] = 1;
          json.actualRespCount[msg.author.id] = 0;
          json.voteCount[msg.author.id] = 0;
          console.log(`${msg.author.username} signed up!`);
          msg.channel.send("Signed up!");
          client.guilds.get("439313069613514752").members.get(msg.author.id).addRole("481831093964636161");
          log.send(`${msg.author.username} signed up! There are now ${json.contestants.length} contestants competing!`);
        }
      }
      break;
    case "respond":
      if (json.current != "respond") {
        log.send(`${msg.author.username} tried to respond, but it was not yet time!`);
        msg.channel.send("Not time to respond yet.")
          .then(msg => {sent = msg;})
          .catch(console.error);
        setTimeout(() => {
          msg.delete();
          sent.delete();
        }, 10000);
        break;
      }
      if (msg.channel.type != "dm") {
        log.send(`${msg.author.username} tried to respond outside of DMs!`);
        msg.delete();
        msg.channel.send("Bud! You should know better than to put your response out in public! Hop into DMs, please.")
          .then(msg => {sent = msg;})
          .catch(console.error);
        setTimeout(() => {
          sent.delete();
        }, 10000);
        break;
      }
      if (json.contestants.indexOf(msg.author.id) == -1) {
        log.send(`${msg.author.username} tried to respond, but they weren't a contestant!`);
        msg.channel.send("You're no contestant! Get out!")
          .then(msg => {sent = msg;})
          .catch(console.error);
        setTimeout(() => {
          msg.delete();
          sent.delete();
        }, 10000);
        break;
      }
      const respNum = parseInt(args[2]);
      if (respNum > json.respCount[msg.author.id]) {
        log.send(`${msg.author.username} tried to exceed their response limit!`);
        msg.channel.send("You don't have that many responses!")
          .then(msg => {sent = msg;})
          .catch(console.error);
        setTimeout(() => {
          msg.delete();
          sent.delete();
        }, 10000);
        break;
      }
      const response = args.slice(3);
      const ind = json.responses.findIndex((cur) => {
        return cur[0] == msg.author.id && cur[1] == respNum;
      });
      if (ind == -1) {
        json.responses.push([msg.author.id, respNum, response.join(" "), response.length]);
        json.actualRespCount[msg.author.id]++;
      } else {
        json.responses[ind] = [msg.author.id, respNum, response.join(" "), response.length];
      }
      let resps = filter(json.responses, (obj, ind, arr) => {
        return obj[0] == msg.author.id;
      });
      for (let i = 0; i < resps.length; i++) {
        resps[i] = resps[i][1];
      }
      msg.channel.send(`Your response has been recorded. This is response index ${respNum}. You have sent ${json.actualRespCount[msg.author.id]} of your ${json.respCount[msg.author.id]} responses. You have sent in responses with these indices: ${resps.join(", ")}.\n
      \nYour response was recorded as: \n\n${response.join(" ")}\n\nIt will be counted as ${response.length} words.`);
      log.send(`${msg.author.username} sent in their response with index ${respNum}. `)
      break;
    case "vote":
      if (json.current != "vote") {
        msg.channel.send("Sorry, but it's not yet voting time.")
          .then(msg => {sent = msg;})
          .catch(console.error);
        setTimeout(() => {
          msg.delete();
          sent.delete();
        }, 10000);
        break;
      }
      if (json.currentVoteScreen[msg.author.id] == undefined) {
        if (json.contestants.indexOf(msg.author.id) != -1) {
          const seed = Random.integer(0, 11881376)(seeder);
          mt.seed(seed);
          var numResps = json.responses.length; 
          for (let i = 0; i < 10 && i < numResps; i++) {
            
          }
        } else {
          // contestant voting
        }
      }
  }
  fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
};