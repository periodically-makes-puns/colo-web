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
    res.status(404).send("Not Found (psst you need to be on the server :D");
    return;
  } else {
    const csrf = JSON.parse(fs.readFileSync("./protecc/csrf.json"));
    if (!csrf.hasOwnProperty(req.user.id)) {
      csrf[req.user.id] = [];
    }
    fs.writeFileSync("./protecc/csrf.json", JSON.stringify(csrf));
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
    json.voteCount[req.params.id] = (json.voteCount[req.params.id]) ? json.voteCount[req.params.id] : 0;
    if (json.contestants.indexOf(req.params.id) != -1) {
      if (json.voteCount[req.params.id] < json.actualRespCount[req.params.id]) {
        gseed = `${seed}-${req.params.id}-${json.voteCount[req.params.id]+1}`;
      } else {
        gseed = `${seed}`;
      }
    } else {
      gseed = `${seed}`;
    }
    if (req.query.hasOwnProperty("screenNum") && parseInt(req.query.screenNum) <= json.voteCount[req.params.id]) {
      gseed = json.priorVoteScreens[req.params.id][parseInt(req.query.screenNum)-1];
    }
    json.currentVoteScreen[req.params.id] = gseed;
    json.priorVoteScreens[req.params.id] = [];
    fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
  } else {
    gseed = json.currentVoteScreen[req.params.id];
    if (req.query.hasOwnProperty("screenNum") && parseInt(req.query.screenNum) <= json.voteCount[req.params.id]) {
      gseed = json.priorVoteScreens[req.params.id][parseInt(req.query.screenNum)-1];
    }
  }
  screen = sgen(gseed, "anondata");
  res.status(200).render("vote.ejs", {
    'user': req.user,
    'screen': screen,
    "seed": gseed,
    "screenNum": req.query.screenNum || json.voteCount[req.params.id] + 1,
    'priorScreens': json.priorVoteScreens[req.params.id],
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

router.post("/:id/vote", (req, res, next) => {
  let json = req.mtjson;
  let screen;
  let seed;
  if (req.query.screenNum) {
    seed = json.priorVoteScreens[req.params.id][parseInt(req.query.screenNum) - 1];
    screen = sgen(json.priorVoteScreens[req.params.id][parseInt(req.query.screenNum) - 1], "internal");
  } else {
    seed = json.currentVoteScreen[req.params.id];
    screen = sgen(json.currentVoteScreen[req.params.id], "internal");
  }
  voteNum = parseInt(req.query.screenNum);
  if (req.query.seed != seed) {
    res.status(400).send("Authentication details incorrect");
    return;
  }
  let used = [false, false, false, false, false, false, false, false, false, false];
  for (let i = 0; i < req.query.vote.length; i++) {
    if ((req.query.vote.charCodeAt(i) - 65 < 0) || (req.query.vote.charCodeAt(i) - 65 > screen.length)) {
      res.status(400).send("An invalid character has been detected in your vote.");
      return;
    } else if (used[req.query.vote.charCodeAt(i) - 65]) {
      res.status(400).send("A repeated character has been detected in your vote.");
      return;
    } else {
      used[req.query.vote.charCodeAt(i) - 65] = (screen.length - i - 1) / (screen.length - 1);
    }
  }
  let cnt = 0;
  for (let i = 0; i < used.length; i++) {
    if (used[i] === false) {
      cnt++;
    }
  }
  for (let i = 0; i < used.length; i++) {
    if (used[i] === false) {
      used[i] = (cnt - 1) / 2 / (screen.length - 1);
    }
  }
  let otp = [req.params.id, json.voteCount[req.params.id] + 1, []];
  for (let i = 0; i < json.responses.length; i++) {
    otp[2].push(-1);
  }
  for (let i = 0; i < used.length; i++) {
    otp[2][screen[i]] = used[i];
  }
  if (seed == json.currentVoteScreen[req.params.id]) {
    console.log("a");
    json.votes.push(otp);
    json.voteCount[req.params.id]++;
    json.priorVoteScreens.push(json.currentVoteScreen[req.params.id]);
    let gseed;
    mt.autoSeed();
    let seed = Random.integer(1, 11881376)(mt);
    mt.seed(seed);
    if (json.contestants.indexOf(req.params.id) != -1) {
      if (json.voteCount[req.params.id] < json.actualRespCount[req.params.id]) {
        gseed = `${seed}-${req.params.id}-${json.voteCount[req.params.id]+1}`;
      } else {
        gseed = `${seed}`;
      }
    } else {
      gseed = `${seed}`;
    }
    json.currentVoteScreen[req.params.id] = gseed;
  } else {
    console.log("b");
    let ind = json.votes.findIndex((val) => {
      return val[0] == req.params.id && val[1] == (req.query.screenNum || json.voteCount[req.params.id]+1);
    });
    json.votes[ind] = otp;
  }
  fs.writeFileSync("./mtwow/mtwow.json", JSON.stringify(json));
  res.status(200).send("OK");
});

router.post('/:id/logout', (req, res, next) => {
  res.clearCookie("login");
  res.clearCookie("s");
  res.redirect("http://localhost:50541");
});

module.exports = router;