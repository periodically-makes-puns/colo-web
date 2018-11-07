#!/usr/bin/env node

/*jshint esversion: 6*/
const SQLite = require("better-sqlite3");
var data = new SQLite("./mtwow/mtwow.sqlite");


/*
data.prepare("DROP TABLE IF EXISTS Status;").run();
data.prepare("DROP TABLE IF EXISTS Contestants;").run();
data.prepare("DROP TABLE IF EXISTS Voters;").run();
data.prepare("DROP TABLE IF EXISTS Responses;").run();
data.prepare("DROP TABLE IF EXISTS Votes;").run();
data.prepare("CREATE TABLE IF NOT EXISTS Status (timeleft integer, current string NOT NULL, prompt string);").run();
data.prepare("INSERT INTO Status (current) VALUES ('nothing');").run();
data.prepare("CREATE TABLE IF NOT EXISTS Contestants (userid text primary key, subResps integer, numResps integer, lives integer, spell integer);").run();
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
const proxy = require("http-proxy");
var proxyServer = proxy.createProxyServer({
  secure: false,
});

const cred = JSON.parse(fs.readFileSync("./token.json", "utf-8"));
const admins = ["262173579876106240", "248953835899322370"];
var privateKey  = fs.readFileSync('./protecc/server.key', 'utf8');
var certificate = fs.readFileSync('./protecc/server.crt', 'utf8');
var credentials = {key: privateKey, cert: certificate, requestCert: false, rejectUnauthorized: false};
const mtwow = require("./mtwow/mtwow.js");
const madmin = require("./mtwow/madmin.js");
const restart = require('proc-restart');
const cookieSession = require("cookie-session");
const Ping = require('ping-lite');
const csrf = require("csurf"); 
var ping = new Ping('www.pmpuns.com');
var csrfProtection = csrf({cookie: true});

setInterval(() => {
  ping.send(function(err, ms) {
    if (err) {
      console.log("Error! Error! Error!");
      console.error(err);
      return;
    }
    currtime = new Date();
    console.log(currtime.toString())
    console.log('www.pmpuns.com responded in '+ms+'ms.');
    client.channels.get("475115017876930560").send(currtime.toString())
    client.channels.get("475115017876930560").send('www.pmpuns.com responded in '+ms+'ms.')
  });
}, 900000);

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
      // msg.channel.send("Yeah, I totally agree as well.");
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
    scriptSrc: ["'self'", "'unsafe-inline'", "https://localhost:10683", "'unsafe-eval'"],
    connectSrc: ["'self'", "https://pmpuns.com"],
  },
}));
app.set("trust proxy", 1);
app.use(cookieSession({
  name: "session",
  secret: tcreds.csec,
  secure: true,
  httpOnly: true,
}));
app.use(csrfProtection);
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

// attaching discord client (probably unsafe) for further use
app.use((req, res, next) => {
  req.client = client;
  next();
});

var SECRET_URL = tcreds.surl;

app.all('/' + SECRET_URL + "/*", (req, res) => {
  proxyServer.web(req, res, {target: "https://192.168.1.3:10683"});
});

app.get('/', (req, res) => {
  res.redirect("/api/discord/login?cookie=1");
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/discord', require('./api/discord.js'));
app.use('/user', require("./user.js"));
app.use((err, req, res, next) => {
  if (err.code == "EBADCSRFTOKEN") {
    res.status(403);
    console.log("CSRF Attack Detected!");
    return res.send({
      status: 'ERROR',
    });
  }
  console.error(err);
  switch (err.message) {
    case 'NoCodeProvided':
      return res.status(400).send({
        status: 'ERROR',
      });
    default:
      return res.status(500).send({
        status: 'ERROR',
      });
  }
});

proxyServer.on('error', function(e) {
  console.error(e);
});

client.login(tcreds.token);

var httpServer = http.createServer(app);
var httpsServer = https.createServer(credentials, app);

client.on("ready", () => { // when bot is ready to go
  client.user.setPresence({game: {name: "m^help for more details!", status: 'online'}});
  httpServer.listen(80);
  httpsServer.listen(443);
  console.log("Ready to go!");
});

