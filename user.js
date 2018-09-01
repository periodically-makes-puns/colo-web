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
var changeStatus = data.prepare("UPDATE Status SET current = @status;");
var getResps = data.prepare("SELECT * FROM Responses WHERE userid = @userid;");
var getSpecificResp = data.prepare("SELECT * FROM Responses WHERE userid = @userid AND respNum = @respNum");
var getUserData = data.prepare("SELECT * FROM (SELECT * FROM Contestants LEFT JOIN Votes USING(userid) UNION ALL SELECT * FROM Votes LEFT JOIN Contestants USING(userid) WHERE Contestants.userid IS NULL) WHERE userid = @userid;");
var getContestantData = data.prepare("SELECT * FROM Contestants WHERE userid = @userid;");
var getVoterData = data.prepare("SELECT * FROM Voters WHERE userid = @userid;");
var getVotes = data.prepare("SELECT * FROM Votes WHERE userid = @userid;");
var getSpecificVote = data.prepare("SELECT * FROM Votes WHERE userid = @userid AND voteNum = @voteNum;");
var getRespsOverWC = data.prepare("SELECT * FROM Responses WHERE userid = @userid AND words > 10;");
var addResponse = data.prepare("INSERT INTO Responses (userid, respNum, response, wc) VALUES (@userid, @respNum, @response, @wc);");
var addVoteSeed = data.prepare("INSERT INTO Votes (userid, voteNum, seed) VALUES (@userid, @voteNum, @seed);");
var editVote = data.prepare("UPDATE Votes SET vote = @vote WHERE userid = @userid AND voteNum = @voteNum;");
var editResponse = data.prepare("UPDATE Responses SET response = @response, wc = @wc WHERE userid = @userid AND respNum = @respNum;");
var editVoteCount = data.prepare("UPDATE Voters SET voteCount = @voteCount WHERE userid = @userid;");
var editSubResps = data.prepare("UPDATE Contestants SET subResps = @subResps WHERE userid = @userid;");
var editNumResps = data.prepare("UPDATE Contestants SET numResps = @numResps WHERE userid = @userid;");
var killContestant = data.prepare("DELETE FROM Contestants WHERE userid = @userid;");
var addContestant = data.prepare("INSERT INTO Contestants (userid, subResos, numResps) VALUES (@userid, @subResps, @numResps);");

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
  if (!req.user) {
    res.status(404).send("Not Found (psst you need to be on the server :D");
    return;
  } else {
    // attach CSRF
  }
  next();
});

router.get("/:id/home", (req, res, next) => {
  let userData = getUserData.get({userid: req.params.id});
  let overWC = getRespsOverWC.all({userid: req.params.id});
  res.status(200).render("home.ejs", {
    'user': req.user,
    'status': getStatus.get().current,
    'subResps': userData.subResps,
    'numResps': userData.numResps,
    'over': overWC.length > 0,
    'numVotes': userData.voteCount,
    "signed_up": userData.numResps,
  });
});

router.get("/:id/respond", (req, res, next) => {
  let status = getStatus.get().current;
  let contestantData = getContestantData.get({userid: req.params.id});
  let responses = getResps.all({userid: req.params.id});
  res.status(200).render("respond.ejs", {
    'user': req.user,
    'subResps': contestantData.subResps,
    'numResps': contestantData.numResps,
    'responses': responses,
    'isRes': status == "responding",
  });
});

router.get("/:id/vote", (req, res, next) => {
  let voterData = getVoterData.get({userid: req.params.id});
  let votes = getVotes.all({userid: req.params.id});
  let contestantData = getContestantData.get({userid: req.params.id});
  let screen;
  let gseed;
  if (!votes) {
    mt.autoSeed();
    let seed = Random.integer(1, 11881376)(mt);
    mt.seed(seed);
    if (!contestantData.hasOwnProperty("voteCount")) {
      editVoteCount.run({userid: userid, voteCount: 0});
    }
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
    if (req.body[`response${i}`]) {
      let resp = json.responses.findIndex((obj) => {
        return obj[0] == req.params.id && obj[1] == i;
      });
      if (resp != -1) {
        json.responses[resp] = [req.params.id, i, req.body[`response${i}`], req.body[`response${i}`].split(/\s+/g).length];
      } else {
        json.responses.push([req.params.id, i, req.body[`response${i}`], req.body[`response${i}`].split(/\s+/g).length]);
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
  console.log("passed");
  if (req.body.hasOwnProperty("screenNum") && req.body.screenNum != json.priorVoteScreens[req.params.id].length + 1) {
    seed = json.priorVoteScreens[req.params.id][parseInt(req.body.screenNum) - 1];
    screen = sgen(json.priorVoteScreens[req.params.id][parseInt(req.body.screenNum) - 1], "internal");
  } else {
    seed = json.currentVoteScreen[req.params.id];
    screen = sgen(json.currentVoteScreen[req.params.id], "internal");
  }
  voteNum = parseInt(req.body.screenNum);
  console.log("dp");
  console.log(seed);
  console.log(req.body);
  if (req.body.seed != seed) {
    res.status(400).send("Authentication details incorrect");
    return;
  }
  let used = [false, false, false, false, false, false, false, false, false, false];
  console.log(req.body.vote);
  for (let i = 0; i < req.body.vote.length; i++) {
    if ((req.body.vote.charCodeAt(i) - 65 < 0) || (req.body.vote.charCodeAt(i) - 65 > screen.length)) {
      res.status(400).send("An invalid character has been detected in your vote.");
      return;
    } else if (used[req.body.vote.charCodeAt(i) - 65]) {
      res.status(400).send("A repeated character has been detected in your vote.");
      return;
    } else {
      used[req.body.vote.charCodeAt(i) - 65] = (screen.length - i - 1) / (screen.length - 1);
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
  console.log(otp);
  if (seed == json.currentVoteScreen[req.params.id]) {
    console.log("a");
    json.votes.push(otp);
    json.voteCount[req.params.id]++;
    json.priorVoteScreens[req.params.id].push(json.currentVoteScreen[req.params.id]);
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
      return val[0] == req.params.id && val[1] == (req.body.screenNum || json.voteCount[req.params.id]+1);
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