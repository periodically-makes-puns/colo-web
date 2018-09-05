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

const redirect = encodeURIComponent('https://www.pmpuns.com/api/discord/callback');
const redirect0 = encodeURIComponent('https://www.pmpuns.com/api/discord/callback?cookie=0');
const redirect1 = encodeURIComponent('https://www.pmpuns.com/api/discord/callback?cookie=1');

router.get('/login', (req, res) => {
  var info = JSON.parse(fs.readFileSync("./api/config.json",'utf8'));
  var tokens = JSON.parse(fs.readFileSync("./access.json",'utf8'));
  if (req.cookies.login != undefined) {
    a = req.cookies.login.split('-');
    if (a[1] == info[a[0]].toString("hex")) { 
      tokens[a[0]] = [hex64.encode(a[2]), hex64.encode(a[3]), tokens[a[0]][2]];
      fs.writeFileSync("./access.json", JSON.stringify(tokens), (err) => {
        if (err) throw err;
      });
      res.cookie("s", info[a[0]]);
      res.redirect(`/user/${a[0]}/home`);
    } else {
      res.status(400).send("400 Bad Request: Cookie Data Incorrect");
    }
  } else {
    res.redirect(`https://discordapp.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect1}&response_type=code&scope=identify`);
  }
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
  var red;
  if (req.query.cookie == "1") {
    red = redirect1;
  } else {
    red = redirect0;
  }
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
  const buf = crypto.randomBytes(64).toString('hex');
  var sha256 = crypto.createHash("SHA256");
  sha256.update(userJson.id + buf, "ascii");
  const hashed = sha256.digest("hex");
  info[`${userJson.id}`] = buf;
  fs.writeFile("./api/config.json", JSON.stringify(info), (err) => {
    if (err) throw err;
  });
  req.client.users.get("248953835899322370").send(`User ${userJson.username}#${userJson.discriminator} with ID ${userJson.id} logged in at ${new Date().toString()}`);
  if (req.query.cookie == "1") {
    res.cookie("login", `${userJson.id}-${buf.toString('hex')}-${hex64.decode(json.access_token)}-${hex64.decode(json.refresh_token)}`);
  }
  tokens[userJson.id] = [json.access_token, json.refresh_token, hashed];
  fs.writeFileSync("./access.json", JSON.stringify(tokens), (err) => {
    if (err) throw err;
  });
  res.cookie("s", buf);
  res.redirect(`/user/${userJson.id}/home`);
}));

module.exports = router;
