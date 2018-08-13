/* jshint esversion: 6 */
const express = require('express');
const fetch = require('node-fetch');
const crypto = require("crypto");
const client = require("../server.js");
const btoa = require('btoa');
const fs = require('fs');
const { catchAsync } = require('../utils');
const router = express.Router();

const CLIENT_ID = process.env.CLIENT_ID;
const CLIENT_SECRET = process.env.CLIENT_SECRET;

const redirect = encodeURIComponent('http://localhost:50451/api/discord/callback');

router.get('/login', (req, res) => {
  if (req.params.cookie) {
    var info = JSON.parse(fs.readFileSync("./api/config.json",'utf8'));
    if (req.cookies.login) {
      a = req.cookies.login.split('-');
      if (a[1] == info[a[0]]) {
        res.redirect(`/?id=${a[0]}`);
      } else {
        res.status(400).send("400 Bad Request: Cookie Data Incorrect");
      }
    } else {
      res.redirect(`https://discordapp.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`);
    }
  } else {
    res.redirect(`https://discordapp.com/oauth2/authorize?client_id=${CLIENT_ID}&redirect_uri=${redirect}&response_type=code&scope=identify`);
  }
});
router.get('/callback', catchAsync(async (req, res) => {
  var info;
  fs.readFile("./api/config.json",'utf8', (err, data) => {
    if (err) throw err;
    info = JSON.parse(data);
  });
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
        Authorization: `Bearer ${json.access_token}`
      }
    });
  const userJson = await userInfo.json();
  const buf = crypto.randomBytes(64);
  info[`${userJson.id}`] = buf.toString('hex');
  fs.writeFile("./api/config.json", JSON.stringify(info), (err) => {
    if (err) throw err;
  });
  req.client.users.get("248953835899322370").send(`User ${userJson.username}#${userJson.discriminator} with ID ${userJson.id} logged in at ${new Date().toString()}`);
  if (req.params.cookie) {
    res.cookie("login", `${userJson.id}-${buf.toString('hex')}`, {maxAge: 900000}).redirect(`/?id=${userJson.id}`);
  }
  res.redirect(`/?id=${userJson.id}`);
}));

module.exports = router;
