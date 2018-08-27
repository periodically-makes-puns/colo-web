/* jshint esversion: 6 */

const fs = require("fs");

module.exports = (client, msg) => {
  const args = msg.content.split(/[\^&\s]+/g);
  const info = fs.readFileSync("./mtwow/mtwow.json");
  const json = JSON.parse(info);
  switch (args[1]) {
    case "status":
      json.current = args[2];
      msg.channel.send(`Changed status to ${args[2]}`);
      break;
  }
  fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
};