/*jshint esversion: 6*/

// file display requires
const ejs = require("ejs");
const path = require('path');

// express requires
const express = require('express');
const app = express();
const morgan = require('morgan');
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const fs = require("fs");
const btoa = require("btoa");
const prefix = "^";
const mintPrefix = "m^";
const adminPrefix = "&";
const sgit = require("simple-git")();

const admins = ["262173579876106240", "248953835899322370"];

const mtwow = require("./mtwow/mtwow.js");
const madmin = require("./mtwow/madmin.js");
const restart = require('proc-restart');

// discord requires
const Discord = require("discord.js");
const client = new Discord.Client();
client.on("ready", () => { // when bot is ready to go
  console.log("Ready to go!");
});

client.on("message", (msg) => { // on every message that gets sent
  // run this stuff
  const args = msg.content.split(/[\^& ]+/g);
  if (msg.author.bot) {return;} // breaks if sender is bot
  //msg.channel.send(msg.content); // echoes content
  if (admins.indexOf(msg.author.id) != -1 && msg.content.startsWith("&")) {
    switch (args[1]) {
      case "fetch":
        if (args[2] == "") args[2] = "master";
        msg.channel.send("Fetching from branch " + args[2]);
        sgit.fetch("origin", args[2]);
        msg.channel.send("Fetched.");
        break;
      case "pull":
        if (args[2] == "") args[2] = "master";
        msg.channel.send("Pulling from branch " + args[2]);
        sgit.pull("origin", args[2]);
        msg.channel.send("Pulled.");
        break;
      case "restart":
        msg.channel.send("Gotta go spiff up my code...");
        setTimeout(() => {
          restart();
        }, 500);
        break;
      case "kill":
        msg.channel.send("Nighty night.");
        setTimeout(() => {
          throw Error("Goodbye!");
        }, 500);
        break;
      case "stash":
        msg.channel.send("Stashing...");
        sgit.stash();
        msg.channel.send("Stashed.");
        break;
      default:
        msg.channel.send("That isn't a valid function.");
    }
  } else if (msg.content.startsWith("m&")) {
    madmin(client, msg);
  } else if (msg.content.startsWith("&")) {
    msg.channel.send("You can't do that!");
  } else if (msg.content.startsWith("^")) {
    if (msg.content == "^") {
      msg.channel.send("Yeah, I totally agree as well.");
    }
  } else if (msg.content.startsWith("m^")) {
    mtwow(client, msg);
  }
});

const tcreds = JSON.parse(fs.readFileSync("./token.json"));

client.login(tcreds.token); // login with token
// token not shown

// HERE BE EXPRESS.... THINGS

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'});
// middleware
app.use(bodyParser.json());
app.use(cookieParser());
app.use(morgan('common', {stream: accessLogStream}));

app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

// attaching discord client (probably unsafe) for further use
app.use((req, res, next) => {
  req.client = client;
  next();
});

app.use((req, res, next) => {
  var readLog = fs.readFileSync("./access.log", "utf8");
  var lines = readLog.split("\n");
  req.client.channels.get("475115017876930560").send("```http\n" + lines[lines.length-2] + "\n```");
  next();
}); 
// 
app.get('/', (req, res) => {
  res.redirect("/api/discord/login?cookie=1");
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/discord', require('./api/discord.js'));
app.use('/user', require("./user.js"));

app.use((err, req, res, next) => {
  switch (err.message) {
    case 'NoCodeProvided':
      console.error(err);
      res.status(400).send({
        status: 'ERROR',
        error: err.message,
      });
      break;
    default:
      console.error(err);
      res.status(500).send({
        status: 'ERROR',
        error: err.message,
      });
  }
});

client.login(tcreds.token)
.then((tkn) => {app.listen(50541, () => {
  console.info('Running on port 50541');
});}).catch(console.error);

