/*jshint esversion: 6*/

const express = require('express');
const path = require('path');
const Discord = require("discord.js");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const client = new Discord.Client();
const app = express();
const mtwow = require("./mtwow/mtwow.js");

client.on("ready", () => {
  console.log("Ready to go!");
});

client.on("message", (msg) => {
  // run this stuff
  if (msg.author.bot) {return;} // breaks if sender is bot
  if (admins.indexOf(msg.author.id) != -1) {
    if (msg.content.startsWith("&fetch")) {
      var args = msg.content.split(/[& ]+/g);
      if (args[2] == "") args[2] = "master";
      msg.channel.send("Fetching from branch " + args[2]);
      sgit.fetch("origin", args[2]);
      msg.channel.send("Fetched.");
    } else if (msg.content.startsWith("&pull")) {
      var args = msg.content.split(/[& ]+/g);
      if (args[2] == "") args[2] = "master";
      msg.channel.send("Pulling from branch " + args[2]);
      sgit.pull("origin", args[2]);
      msg.channel.send("Pulled.");
    } else if (msg.content.startsWith("&restart")) {
      msg.channel.send("Gotta go spiff up my code...");
      setTimeout(() => {
        restart();
      }, 500);
    } else if (msg.content.startsWith("&kill")) {
      msg.channel.send("Nighty night.");
      setTimeout(() => {
        throw Error("Goodbye!");
      }, 500);
    } else if (msg.content.startsWith("&stash")) {
      msg.channel.send("Stashing...");
      sgit.stash();
      msg.channel.send("Stashed.");
    } else if (msg.content.startsWith("&")) {
      msg.channel.send("That isn't a valid function.");
    }
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

client.login(process.env.TOKEN);

app.use(bodyParser.json());
app.use(cookieParser());

app.use('/*', (req, res, next) => {
  req.client = client;
  next();
});

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'public/index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/discord', require('./api/discord'));

app.use((err, req, res, next) => {
  switch (err.message) {
    case 'NoCodeProvided':
      return res.status(400).send({
        status: 'ERROR',
        error: err.message
      });
    default:
      return res.status(500).send({
        status: 'ERROR',
        error: err.message
      });
  }
});

app.listen(50451, () => {
  console.info('Running on port 50451');
});

