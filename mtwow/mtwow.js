/* jshint esversion: 6 */
const fs = require("fs");


module.exports = (client, msg) => {
  const args = msg.content.split(/[^\w]+/g);
  const data = fs.readFileSync("mtwow.json", "utf-8");
  const json = JSON.parse(data);
  // args[0] is empty, args[1] has command, args[2]+ are arguments to the command
  switch (args[1]) {
    case "signup":
      if (json.current != "signup") {
        msg.channel.send("Sorry, but you can't sign up right now. Maybe later?");
        setTimeout(() => {
          // delete messages
        }, 10000);
      } else {
        if (json.contestants.indexOf(msg.author.id) != -1) {
          msg.channel.send("Sorry, but you've already signed up!");
          setTimeout(() => {
            // delete messages
          }, 10000);
        } else {
          json.contestants.push(msg.author.id);
          json.respCount[msg.author.id] = 1;
          json.actualRespCount[msg.author.id] = 0;
          json.voteCount[msg.author.id] = 0;
          msg.channel.send("Signed up!");
          setTimeout(() => {
            // delete messages
          }, 10000);
        }
      }
      break;
    case "respond":
      if (json.current != "respond") {
        msg.channel.send("Not time to respond yet.");
        setTimeout(() => {
          // delete messages
        }, 10000);
        break;
      }
      if (json.contestants.indexOf(msg.author.id) == -1) {
        msg.channel.send("You're no contestant! Get out!");
        setTimeout(() => {
          // delete messages
        }, 10000);
        break;
      }
      const respNum = parseInt(args[2]);
      if (respNum > json.respCount[msg.author.id]) {
        msg.channel.send("You don't have that many responses!");
        setTimeout(() => {
          // delete messages
        }, 10000);
        break;
      }
      const response = args.slice(3);
      const ind = json.responses.findIndex((cur) => {
        return cur[0] == msg.author.id && cur[1] == respNum;
      });
      if (ind == -1) {
        json.responses.push([msg.author.id, respNum, response.join(" "), response.length]);
      } else {
        json.responses[ind] = [msg.author.id, respNum, response.join(" "), response.length];
      }
      break;
    case "vote":
      if (json.current != "vote") {
        msg.channel.send("Sorry, but it's not yet voting time.");
        setTimeout(() => {
          // delete messages
        }, 10000);
        break;
      }
      if (json.currentVoteScreen[msg.author.id] == undefined) {
        if (json.contestants.indexOf(msg.author.id) != -1) {
          // noncontestant voting
        } else {
          // contestant voting
        }
      }
  }
};