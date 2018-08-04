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

const admins = ["262173579876106240", "248953835899322370"]

const regular = require("./discord/reg-handle");
const restart = require('proc-restart');

// discord requires
const Discord = require("discord.js");
const client = new Discord.Client();
client.on("ready", () => { // when bot is ready to go
  console.log("Ready to go!");
});

client.on("message", (msg) => { // on every message that gets sent
  // run this stuff
  if (msg.author.bot) {return;} // breaks if sender is bot
  //msg.channel.send(msg.content); // echoes content
  if (admins.indexOf(msg.author.id) != -1) {
    if (msg.content == "&fetch") {
      msg.channel.send("Fetching...");
      sgit.fetch("origin", "master");
      msg.channel.send("Fetched.");
    } else if (msg.content == "&pull") {
      msg.channel.send("Pulling...");
      sgit.pull("origin", "master");
      msg.channel.send("Pulled.");
    } else if (msg.content == "&restart") {
      msg.channel.send("Gotta go spiff up my code...");
      setTimeout(() => {
        restart();
      }, 500);
    } else if (msg.content == "&kill") {
      msg.channel.send("Nighty night.");
      setTimeout(() => {
        throw Error("Goodbye!");
      }, 500);
    } else if (msg.content == "&stash") {
      msg.channel.send("Stashing...");
      sgit.stash();
      msg.channel.send("Stashed.");
    }
  } else {
    msg.channel.send("You can't do that!");
  }
});

const tcreds = JSON.parse(fs.readFileSync("./token.json"));

client.login(tcreds.token); // login with token
// token not shown

// HERE BE EXPRESS.... THINGS

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'})
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
  res.status(200).sendFile(path.join(__dirname, 'public/index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/discord', require('./api/discord.js'));
app.use('/home', require("./home.js"));

app.use((err, req, res, next) => {
  switch (err.message) {
    case 'NoCodeProvided':
      console.log(err.message);
      res.status(400).send({
        status: 'ERROR',
        error: err.message,
      });
    default:
      console.log(err.message);
      res.status(500).send({
        status: 'ERROR',
        error: err.message,
      });
  }
});

app.listen(80, () => {
  console.info('Running on port 80 >-<');
});

