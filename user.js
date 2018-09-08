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
const SQLite = require("better-sqlite3");
var data = new SQLite("./mtwow/mtwow.sqlite");
var csrf = new SQLite("./csrf.sqlite");

var getStatus = data.prepare("SELECT current FROM Status;");
var getResps = data.prepare("SELECT * FROM Responses WHERE userid = @userid ORDER BY respNum;");
var getSpecificResp = data.prepare("SELECT * FROM Responses WHERE userid = @userid AND respNum = @respNum;");
var getContestantData = data.prepare("SELECT * FROM Contestants WHERE userid = @userid;");
var getVoterData = data.prepare("SELECT * FROM Voters WHERE userid = @userid;");
var getVotes = data.prepare("SELECT * FROM Votes WHERE userid = @userid ORDER BY voteNum;");
var getVoteSeeds = data.prepare("SELECT seed FROM Votes WHERE userid = @userid ORDER BY voteNum;");
var getRespsOverWC = data.prepare("SELECT * FROM Responses WHERE userid = @userid AND words > 10;");
var addResponse = data.prepare("INSERT INTO Responses (userid, respNum, response, words) VALUES (@userid, @respNum, @response, @wc);");
var addVoteSeed = data.prepare("INSERT INTO Votes (userid, voteNum, seed) VALUES (@userid, @voteNum, @seed);");
var editVote = data.prepare("UPDATE Votes SET vote = @vote WHERE userid = @userid AND voteNum = @voteNum;");
var editResponse = data.prepare("UPDATE Responses SET response = @response, words = @wc WHERE userid = @userid AND respNum = @respNum;");
var editVoteCount = data.prepare("UPDATE Voters SET voteCount = @voteCount WHERE userid = @userid;");
var editSubResps = data.prepare("UPDATE Contestants SET subResps = @subResps WHERE userid = @userid;");
var addContestant = data.prepare("INSERT INTO Contestants (userid, subResps, numResps) VALUES (@userid, @subResps, @numResps);");
var addVoter = data.prepare("INSERT INTO Voters (userid, voteCount) VALUES (@userid, 0)");

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

router.use("/", (req, res, next) => {
  const data = fs.readFileSync("./access.json");
  const json = JSON.parse(data);
  var sha256 = crypto.createHash("SHA256");
  if (!req.cookies.login) {
    res.status(403).send("Authentication details incorrect");
    return;
  }
  sha256.update(req.cookies.login.split("-")[0] + req.cookies.s, "ascii");
  req.id = req.cookies.login.split("-")[0];
  try {
    let a = sha256.digest("hex");
    if (a != json[req.id][2]) {
      res.status(403).send("Authentication details incorrect");
      return;
    }
  } catch (e) {
    res.status(403).send("Authentication details incorrect");
    return;
  }
  req.user = req.client.users.get(req.cookies.login.split("-")[0]);
  
  if (!req.user) {
    res.status(404).send("Not Found (psst you need to be on the server :D");
    return;
  } else {
    // attach CSRF
  }
  next();
});

router.get("/home", (req, res, next) => {
  let contestantData = getContestantData.get({userid: req.id}) || {subResps: 0, numResps: 0};
  let voterData = getVoterData.get({userid: req.id}) || {voteCount: undefined};
  let overWC = getRespsOverWC.all({userid: req.id});
  res.status(200).render("home.ejs", {
    'user': req.user,
    'status': getStatus.get().current,
    'subResps': contestantData.subResps,
    'numResps': contestantData.numResps,
    'over': (overWC.length || 0) > 0,
    'numVotes': voterData.voteCount,
    "signed_up": contestantData.numResps,
  });
});

router.get("/respond", (req, res, next) => {
  let status = getStatus.get().current;
  let contestantData = getContestantData.get({userid: req.id})  || {subResps: 0, numResps: 0};
  let responses = getResps.all({userid: req.id});
  res.status(200).render("respond.ejs", {
    'user': req.user,
    'subResps': contestantData.subResps,
    'numResps': contestantData.numResps,
    'responses': responses,
    'isRes': status == "responding",
  });
});

router.get("/vote", (req, res, next) => {
  let voterData = getVoterData.get({userid: req.id});
  let votes = getVotes.all({userid: req.id});
  let contestantData = getContestantData.get({userid: req.id});
  let screen;
  let gseed;
  if (!voterData) {
    addVoter.run({userid: req.id});
  }
  voterData = getVoterData.get({userid: req.id});
  if (!voterData.hasOwnProperty("voteCount")) {
    editVoteCount.run({userid: req.id, voteCount: 0});
  }
  if (votes == false) {
    mt.autoSeed();
    let seed = Random.integer(1, 11881376)(mt);
    mt.seed(seed);
    voterData = getVoterData.get({userid: req.id});
    if (contestantData) {
      if (voterData.voteCount < contestantData.numResps) {
        gseed = `${seed}-${req.id}-${voterData.voteCount+1}`;
      } else {
        gseed = `${seed}`;
      }
    } else {
      gseed = `${seed}`;
    }
    if (req.query.hasOwnProperty("screenNum")) {
      let rep = votes[parseInt(req.query.screenNum)-1];
      if (!rep || !rep.seed) {
        res.status(400).send("Invalid screen number");
        return;
      } else {
        gseed = rep.seed;
      }
    } else {
      addVoteSeed.run({userid: req.id, voteNum: voterData.voteCount+1, seed: gseed});
    }
  } else {
    gseed = votes[voterData.voteCount].seed;
    if (req.query.hasOwnProperty("screenNum")) {
      let rep = votes[parseInt(req.query.screenNum)-1];
      if (!rep) {
        res.status(400).send("Invalid screen number");
        return;
      } else {
        gseed = rep.seed;
      }
    }
  }
  screen = sgen(gseed, "anondata");
  res.status(200).render("vote.ejs", {
    'user': req.user,
    'screen': screen,
    "seed": gseed,
    "screenNum": req.query.screenNum || voterData.voteCount + 1,
    'priorScreens': getVoteSeeds.all({userid: req.id}),
    'isVot': getStatus.get().current == "voting",
  });
});

router.post("/signup", (req, res, next) => {
  if (getStatus.get().current != "signups" && getStatus.get().current != "responding") {
    res.status(400);
    return;
  }
  let contestantData = getContestantData.get({userid: req.id});
  if (!contestantData) {
    req.client.guilds.get("439313069613514752").members.get(req.id).addRole("481831093964636161", "Signed up via website");
    addContestant.run({userid: req.id, subResps: 0, numResps: 1});
  }
  res.status(200).send("OK");
});

router.post("/respond", (req, res, next) => {
  if (getStatus.get().current != "responding") {
    res.status(400);
    return;
  }
  let contestantData = getContestantData.get({userid: req.id});
  if (!contestantData) {
    res.status(400);
    return;
  }
  for (var i = 1; i < contestantData.numResps+1; i++) {
    if (req.body.hasOwnProperty(`response${i}`)) {
      let resp = getSpecificResp.get({userid: req.id, respNum: i});
      if (resp) {
        editResponse.run({userid: req.id, respNum: i, response: req.body[`response${i}`], wc: req.body[`response${i}`].split(/\s+/g).length});
      } else {
        addResponse.run({userid: req.id, respNum: i, response: req.body[`response${i}`], wc: req.body[`response${i}`].split(/\s+/g).length});
        editSubResps.run({userid: req.id, subResps: contestantData.subResps + 1});
      }
    }
    contestantData = getContestantData.get({userid: req.id});
    if (contestantData.subResps == contestantData.numResps) {
      if (req.client.guilds.get("439313069613514752").members.get(req.id).roles.has("481812129096138772")) {
        req.client.guilds.get("439313069613514752").members.get(req.id).removeRole("481812129096138772");
      }
      if (req.client.guilds.get("439313069613514752").members.get(req.id).roles.has("481812076050907146")) {
        req.client.guilds.get("439313069613514752").members.get(req.id).removeRole("481812076050907146");
      }
    } else if (contestantData.subResps > 0) {
      if (req.client.guilds.get("439313069613514752").members.get(req.id).roles.has("481812076050907146")) {
        req.client.guilds.get("439313069613514752").members.get(req.id).removeRole("481812076050907146");
      }
    }
  }
  res.status(200).send("OK");
});

router.post("/vote", (req, res, next) => {
  let screen;
  let seed;
  let votes = getVoteSeeds.all({userid: req.id});
  let voterData = getVoterData.get({userid: req.id});
  if (req.body.hasOwnProperty("screenNum") && parseInt(req.body.screenNum) != votes.length + 1) {
    seed = votes[parseInt(req.body.screenNum) - 1].seed;
  } else {
    seed = votes[votes.length - 1].seed;
  }
  screen = sgen(seed, "internal");
  voteNum = parseInt(req.body.screenNum);
  if (req.body.seed != seed) {
    res.status(400).send("Authentication details incorrect");
    return;
  }
  let used = [false, false, false, false, false, false, false, false, false, false];
  for (let i = 0; i < req.body.vote.length; i++) {
    if ((req.body.vote.charCodeAt(i) - 65 < 0) || (req.body.vote.charCodeAt(i) - 65 > screen.length)) {
      res.status(400).send("An invalid character has been detected in your vote.");
      return;
    } else if (used[req.body.vote.charCodeAt(i) - 65]) {
      res.status(400).send("A repeated character has been detected in your vote.");
      return;
    }
  }
  if (seed == votes[votes.length - 1].seed) {
    editVote.run({userid: req.id, voteNum: votes.length, vote: req.body.vote});
    editVoteCount.run({userid: req.id, voteCount: voterData.voteCount + 1});
    let contestantData = getContestantData.get({userid: req.id});
    voterData = getVoterData.get({userid: req.id});
    let gseed;
    mt.autoSeed();
    let seed = Random.integer(1, 11881376)(mt);
    mt.seed(seed);
    if (contestantData) {
      if (voterData.voteCount < contestantData.subResps) {
        gseed = `${seed}-${req.id}-${voterData.voteCount+1}`;
      } else {
        gseed = `${seed}`;
      }
    } else {
      gseed = `${seed}`;
    }
    addVoteSeed.run({userid: req.id, voteNum: voterData.voteCount + 1, seed: gseed});
  } else {
    editVote.run({userid: req.id, voteNum: parseInt(req.body.screenNum), vote: req.body.vote});
  }
  res.status(200).send("OK");
});

router.post('/logout', (req, res, next) => {
  res.clearCookie("login");
  res.clearCookie("s");
  res.redirect("https://pmpuns.com");
});

module.exports = router;