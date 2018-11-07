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
const red = `https://discordapp.com/oauth2/authorize?response_type=code&client_id=${CLIENT_ID}&scope=identify&redirect_uri=${redirect}`;

router.get('/login', (req, res) => {
  if (!req.session.isPopulated) res.redirect(red);  
  else {
    var tokens = JSON.parse(fs.readFileSync("./access.json",'utf8'));
    if (!tokens.hasOwnProperty(req.session.id)) res.redirect(red);
    else if (tokens[req.session.id]) {
      args = tokens[req.session.id].split("-");
      req.session.access = tokens[1];
      req.session.refresh = tokens[2];
      res.redirect("/user/home");
    } else {
      req.session = null;
      res.redirect(red);
    }
  }
});

router.get('/callback', catchAsync(async (req, res) => {
  var tokens;
  await fs.readFile("access.json", (error, data) => {
    if (error) {
      console.error(error);
      return;
    }
    tokens = JSON.parse(data);
  })
  if (!req.query.code) {
    throw new Error('NoCodeProvided');
  }
  const code = req.query.code;
  const creds = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
  const response = await fetch(`https://discordapp.com/api/oauth2/token?grant_type=authorization_code&code=${code}&redirect_uri=${redirect}`, {
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
  tokens[userJson.id] = `${userJson.id}-${json.access_token}-${json.refresh_token}`;
  req.session.id = userJson.id;
  req.session.access = json.access_token;
  req.session.refresh = json.refresh_token;
  await fs.writeFile("access.json", JSON.stringify(tokens), console.error);
  res.redirect(`/user/home`);
}));

module.exports = router;
