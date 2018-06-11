/*jshint esversion: 6*/
const ejs = require("ejs");
const express = require('express');
const path = require('path');
const Discord = require("discord.js");
const cookieParser = require("cookie-parser");
const bodyParser = require("body-parser");
const client = new Discord.Client();
const app = express();
const morgan = require('morgan');

client.on("ready", () => {
  console.log("Ready to go!");
});

client.on("message", (msg) => {
  if (msg.author.bot) {return;}
  msg.channel.send(msg.content);
});

client.login(process.env.TOKEN);

app.use(bodyParser.json());
app.use(cookieParser());
app.use(morgan('dev'));
app.engine('html', ejs.renderFile);
app.set('view engine', 'html');

app.use((req, res, next) => {
  req.client = client;
  next();
});

app.get('/', (req, res) => {
  res.status(200).sendFile(path.join(__dirname, 'public/index.html'));
});

app.use(express.static(path.join(__dirname, 'public')));

app.use('/api/discord', require('./api/discord.js'));
app.use('/home', require("./home.js"));

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

