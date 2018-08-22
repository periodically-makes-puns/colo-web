/* jshint esversion: 6 */
const fs = require("fs");

module.exports = async (client, msg) => {
  var args = msg.content.split(/[\^&\s]+/g);
  var data = fs.readFileSync("./mtwow/mtwow.json", "utf-8");
  var json = JSON.parse(data);
  switch (args[1]) {
    case "status":
      json.current = args[2];
      msg.channel.send(`Set status to ${args[2]}`);
      break;
    case "startresp":
      json.current = "respond";
      for (let i = 0; i < json.contestants.length; i++) {
        try {
          await client.guilds.get("439313069613514752").members.get(json.contestants[i]).addRoles(["481812076050907146", "481812129096138772"], `Contestant ${i+1} of ${json.contestants.length}`);
          client.channels.get("480897127262715924").send(`Gave contestant ${client.users.get(json.contestants[i]).username} roles ${client.guilds.get("439313069613514752").roles.get("481812076050907146").name}, ${client.guilds.get("439313069613514752").roles.get("481812129096138772").name}`);
        } catch (e) {
          console.error(e);
          client.channels.get("480897127262715924").send(`⚠ <@262173579876106240> Contestant with ID ${json.contestants[i]} was not found! <@248953835899322370> ⚠`);
        }
      }
      json.prompt = msg.content.split("``")[1];
      break;
    case "startvote": 
      json.current = "vote";
      for (let i = 0; i < json.contestants.length; i++) {
        try {
          const contestant = client.guilds.get("439313069613514752").members.get(json.contestants[i]);
          if (contestant.roles.has("481812076050907146")) {
            client.channels.get("480897127262715924").send(`Contestant ${contestant.name} has DNPed. Revoking roles now.`);
          }
        } catch (e) {

        }
      }
    }
  fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
}