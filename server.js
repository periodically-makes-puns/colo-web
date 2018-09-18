/*jshint esversion: 6*/
const SQLite = require("better-sqlite3");
var data = new SQLite("./mtwow/mtwow.sqlite");


/*
data.prepare("DROP TABLE IF EXISTS Status;").run();
data.prepare("DROP TABLE IF EXISTS Contestants;").run();
data.prepare("DROP TABLE IF EXISTS Voters;").run();
data.prepare("DROP TABLE IF EXISTS Responses;").run();
data.prepare("DROP TABLE IF EXISTS Votes;").run();
data.prepare("CREATE TABLE IF NOT EXISTS Status (current string NOT NULL, prompt string);").run();
data.prepare("INSERT INTO Status (current, prompt) VALUES ('responding', 'no u');").run();
data.prepare("CREATE TABLE IF NOT EXISTS Contestants (userid text primary key, subResps integer, numResps integer);").run();
data.prepare("CREATE TABLE IF NOT EXISTS Voters (userid text primary key, voteCount integer);").run();
data.prepare("CREATE TABLE IF NOT EXISTS Responses (id integer primary key, userid text, respNum integer, response text, words integer);").run();
data.prepare("CREATE TABLE IF NOT EXISTS Votes (id integer primary key, userid text, voteNum integer, seed text, vote text);").run();
console.log("Done.");
*/

const fs = require("fs");
const sgit = require("simple-git")();
const morgan = require("morgan");
const express = require('express');
const path = require('path');
const http = require("http");
const https = require("https");
const Discord = require("discord.js");
const ejs = require("ejs");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const client = new Discord.Client();
const helmet = require("helmet");
const app = express();
const cred = JSON.parse(fs.readFileSync("./token.json", "utf-8"));
const admins = ["262173579876106240", "248953835899322370"];
var privateKey  = fs.readFileSync('./protecc/server.key', 'utf8');
var certificate = fs.readFileSync('./protecc/server.crt', 'utf8');

var credentials = {key: privateKey, cert: certificate, requestCert: false, rejectUnauthorized: false};
const mtwow = require("./mtwow/mtwow.js");
const madmin = require("./mtwow/madmin.js");
const restart = require('proc-restart');



// discord requires


client.on("message", (msg) => { // on every message that gets sent
  // run this stuff
  console.log(`${msg.author.username} sent a message. The content was \n${msg.content}\n`);
  const args = msg.content.split(/[\^&\s]+/g);
  if (msg.author.bot) {return;} // breaks if sender is bot
  //msg.channel.send(msg.content); // echoes content
  if (admins.indexOf(msg.author.id) != -1 && msg.content.startsWith("&")) {
    switch (args[1]) {
      case "fetch":
        console.log(`${msg.author.username} ran a GIT FETCH command. ⚠ This requires admin permissions. ⚠`);
        if (args[2] == "") args[2] = "master";
        msg.channel.send("Fetching from branch " + args[2]);
        sgit.fetch("origin", args[2]);
        msg.channel.send("Fetched.");
        break;
      case "pull":
        console.log(`${msg.author.username} ran a GIT PULL command. ⚠ This requires admin permissions. ⚠`);
        if (args[2] == "") args[2] = "master";
        msg.channel.send("Pulling from branch " + args[2]);
        sgit.pull("origin", args[2]);
        msg.channel.send("Pulled.");
        break;
      case "restart":
        console.log(`${msg.author.username} ran a RESTART command. ⚠ This requires admin permissions. ⚠`);
        msg.channel.send("Gotta go spiff up my code...");
        setTimeout(() => {
          restart();
        }, 500);
        break;
      case "kill":
      console.log(`${msg.author.username} ran a KILL command. ⚠ This requires admin permissions. ⚠`);
        msg.channel.send("Nighty night.");
        setTimeout(() => {
          throw Error("Goodbye!");
        }, 500);
        break;
      case "stash":
        console.log(`${msg.author.username} ran a STASH command. ⚠ This requires admin permissions. ⚠`);
        msg.channel.send("Stashing...");
        sgit.stash();
        msg.channel.send("Stashed.");
        break;
      default:
        msg.channel.send("That isn't a valid function.");
    }
  } else if (admins.indexOf(msg.author.id) != -1 && msg.content.startsWith("m&")) {
    console.log(`${msg.author.username} ran a MINITWOW ADMINISTRATOR type command. ⚠ This requires admin permissions. ⚠`);
    madmin(client, msg);
  } else if (msg.content.startsWith("&") || msg.content.startsWith("m&")) {
    msg.channel.send("You can't do that!");
  } else if (msg.content.startsWith("^")) {
    if (msg.content == "^") {
      msg.channel.send("Yeah, I totally agree as well.");
    }
  } else if (msg.content.startsWith("m^")) {
    console.log(`${msg.author.username} ran a MINITWOW NORMAL type command.`);
    mtwow(client, msg);
  }
});

const tcreds = JSON.parse(fs.readFileSync("./token.json"));

// token not shown

// HERE BE EXPRESS.... THINGS

var accessLogStream = fs.createWriteStream(path.join(__dirname, 'access.log'), {flags: 'a'});
// middleware
app.use(bodyParser.urlencoded({extended: true}));
app.use(cookieParser("secret"));
app.use(cookieParser());
app.use(morgan('common', {stream: accessLogStream}));
app.use(helmet());
app.use(helmet.contentSecurityPolicy({
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: ["'self'", "'unsafe-inline'"],
    imgSrc: ["'self'", "data:"],
    scriptSrc: ["'self'", "'sha256-V5MGK9/CO7JvQzUHNNiGSkY2upVgeB0jGjzDUeKicl8='", "'sha256-Fi2rhYYy0MhXdVQgpTA1q0d2RyIsSP9Z69PjN85GiYg='", "'sha256-G7bcDiYmXiz83JPv7w1RK1CKFhJ38I0NutSnzhNmHMI='", "'sha256-0p7PxxIIvj4LCxwSZPKtMp1fOWhDvyYffGYgf56gSgI='"],
    connectSrc: ["'self'", "https://pmpuns.com"],
  },
}));

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
  console.error(err);
  switch (err.message) {
    case 'NoCodeProvided':
      return res.status(400).send({
        status: 'ERROR',
        error: err.message,
      });
    default:
      return res.status(500).send({
        status: 'ERROR',
        error: err.message,
      });
  }
});

client.login(tcreds.token);

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

client.on("ready", () => { // when bot is ready to go
  httpServer.listen(80);
  httpsServer.listen(443);
  console.log("Ready to go!");
});

