/*jshint esversion: 6*/
const express = require("express");
const ejs = require("ejs");
const fs = require("fs");
const crypto = require("crypto");
const router = new express.Router();
const {catchAsync} = require("./utils.js");
const path = require("path");
const sgen = require("./mtwow/screengen.js");
const Random = require("random-js");
var mt = Random.engines.mt19937();


const filter = (arr, func) => {
  let otp = [];
  for (let i = 0; i < arr.length; i++) {
    if (func(arr[i], i, arr)) {
      otp.push(arr[i]);
    }
  }
  return otp;
};

router.use(express.static(path.join(__dirname, "public")));

router.use("/:id", (req, res, next) => {
  const data = fs.readFileSync("./access.json");
  const json = JSON.parse(data);
  var sha256 = crypto.createHash("SHA256");
  sha256.update(req.params.id + req.cookies.s, "ascii");
  try {
    if (sha256.digest("hex") != json[req.params.id][2]) {
      res.status(403).send("Authentication details incorrect");
      return;
    }
  } catch (e) {
    res.status(403).send("Authentication details incorrect");
    return;
  }
  req.user = req.client.users.get(req.params.id);
  req.mtjson = JSON.parse(fs.readFileSync("./mtwow/mtwow.json"));
  if (!req.user) {
    res.status(404).send("Not Found");
    return;
  }
  next();
});

router.get("/:id/home", (req, res, next) => {
  const json = req.mtjson;
  res.status(200).render("home.ejs", {
    'user': req.user,
    'status': json.current,
    'subResps': json.actualRespCount[req.user.id],
    'numResps': json.respCount[req.user.id],
    'over': filter(json.responses, (obj, ind, arr) => {
      return obj[0] == req.params.id && obj[3] > 10;
    }).length > 0,
    'numVotes': json.voteCount[req.user.id],
    "signed_up": (json.contestants.indexOf(req.user.id) != -1),
  });
});

router.get("/:id/respond", (req, res, next) => {
  const json = req.mtjson;
  res.status(200).render("respond.ejs", {
    'user': req.user,
    'subResps': json.actualRespCount[req.params.id],
    'numResps': json.respCount[req.params.id],
    'responses': filter(json.responses, (obj, ind, arr) => {
      return obj[0] == req.params.id;
    }),
    'isRes': json.current == "responding",
  });
});

router.get("/:id/vote", (req, res, next) => {
  const json = req.mtjson;
  let screen;
  if (!json.currentVoteScreen.hasOwnProperty(req.params.id)) {
    let gseed;
    mt.autoSeed();
    let seed = Random.integer(1, 11881376)(mt);
    mt.seed(seed);
    if (json.contestants.indexOf(req.params.id) != -1) {
      
      json.voteCount[req.params.id] = (json.voteCount[req.params.id]) ? json.voteCount[req.params.id] : 0;
      if (json.voteCount[req.params.id] < json.actualRespCount[req.params.id]) {
        gseed = `${seed}-${req.params.id}-${json.voteCount[req.params.id]+1}`;
        screen = sgen(gseed, "anondata");
      } else {
        gseed = `${seed}`;
        screen = sgen(gseed, "anondata");
      }
    } else {
      gseed = `${seed}`;
      screen = sgen(gseed, "anondata");
    }
    json.currentVoteScreen[req.params.id] = gseed;
    json.priorVoteScreens[req.params.id] = [];
    fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
  } else {
    screen = sgen(json.currentVoteScreen[req.params.id], "anondata");
  }
  res.status(200).render("vote.ejs", {
    'user': req.user,
    'screen': screen,
    'priorScreens': json.voteCount[req.params.id],
    'isVot': json.current == "voting",
  });
});

router.post("/:id/signup", (req, res, next) => {
  const json = req.mtjson;
  if (json.current != "signups") {
    res.status(400);
    return;
  }
  if (json.contestants.indexOf(req.params.id) == -1) {
    req.client.guilds.get("439313069613514752").members.get(req.params.id).addRole("481831093964636161", "Signed up via website");
    json.contestants.push(req.params.id);
    json.respCount[req.params.id] = 1;
    json.actualRespCount[req.params.id] = 0;
    json.voteCount[req.params.id] = 0;
    fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
  }
  res.status(200).send("OK");
});

router.post("/:id/respond", (req, res, next) => {
  let json = req.mtjson;
  if (json.current != "responding") {
    res.status(400);
    return;
  }
  for (var i = 1; i < json.respCount[req.params.id]+1; i++) {
    if (req.query[`response${i}`]) {
      let resp = json.responses.findIndex((obj) => {
        return obj[0] == req.params.id && obj[1] == i;
      });
      if (resp != -1) {
        json.responses[resp] = [req.params.id, i, req.query[`response${i}`], req.query[`response${i}`].split(/\s+/g).length];
      } else {
        json.responses.push([req.params.id, i, req.query[`response${i}`], req.query[`response${i}`].split(/\s+/g).length]);
        json.actualRespCount[req.params.id]++;
      }
    }
  }
  fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
  res.status(200).send("OK");
});

module.exports = router;