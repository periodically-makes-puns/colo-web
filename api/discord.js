/* jshint esversion: 6 */
const express = require('express');
const fetch = require('node-fetch');
const crypto = require("crypto");
const btoa = require('btoa');
const fs = require('fs');
const hex64 = require("hex64");
const { catchAsync } = require('../utils');
const router = express.Router();
const tcreds = JSON.parse(fs.readFileSync("./token.json"));
const CLIENT_ID = tcreds.id;
const CLIENT_SECRET = tcreds.secret;
var cookieSession = require('cookie-session')
const SECRET_KEY = tcreds.csec;

const redirect = encodeURIComponent('https://www.pmpuns.com/api/discord/callback');
const redirect0 = encodeURIComponent('https://www.pmpuns.com/api/discord/callback?cookie=0');
const redirect1 = encodeURIComponent('https://www.pmpuns.com/api/discord/callback?cookie=1');

router.use(cookieSession({
  name: "session",
  secret: SECRET_KEY,
}));

router.get('/login', (req, res) => {
  
});

router.get('/callback', catchAsync(async (req, res) => {
  var info;
  fs.readFile("./api/config.json",'utf8', (err, data) => {
    if (err) throw err;
    info = JSON.parse(data);
  });
  
  var tokens = JSON.parse(fs.readFileSync("./access.json",'utf8'));
  if (!req.query.code) {
    throw new Error('NoCodeProvided');
  }
  const code = req.query.code;
  const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${red}`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${creds}`,
      },
    });
  const json = await response.json();
  const userInfo = await fetch("https://discordapp.com/api/users/@me", {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${json.access_token}`,
      },
    });
  const userJson = await userInfo.json();
  req.session.id = userInfo.id;
  req.session.access = json.access_token;
  req.session.refresh = json.refresh_token;
  res.redirect(`/user/home`);
}));

module.exports = router;
