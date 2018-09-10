/*jshint esversion: 6 */

const fs = require("fs");
const Random = require("random-js");
var mt = Random.engines.mt19937();
const SQLite = require("better-sqlite3");
var data = new SQLite("./mtwow/mtwow.sqlite");

var getStatus = data.prepare("SELECT current FROM Status;");

var getAnonSpecificResp = data.prepare("SELECT id, response, words FROM Responses WHERE userid = @userid AND respNum = @respNum;");
var getAnonAllResps = data.prepare("SELECT id, response, words FROM Responses ORDER BY id;");
var getAnonAllRespsButOne = data.prepare("SELECT id, response, words FROM Responses WHERE userid != @userid OR respNum != @respNum ORDER BY id;");

module.exports = (seed, type) => {
  if (getStatus.get().current != "voting") {
    return;
  }
  let seedargs;
  try {
    seedargs = seed.split("-");
  } catch (e) {
    seedargs = [];
  }
  let out = [];
  mt.autoSeed();
  let rseed = parseInt(seedargs[0]) || Random.integer(1, 11881376)(mt);
  mt.seed(rseed);
  wseed = rseed.toString();
  let responses = getAnonAllResps.all();
  if (seedargs[1] != undefined && seedargs[2] != undefined) {
    let need = getAnonSpecificResp.get({userid: seedargs[1], respNum: parseInt(seedargs[2])});
    out.push(need);
    responses = getAnonAllRespsButOne.all({userid: seedargs[1], respNum: parseInt(seedargs[2])});
    out = out.concat(Random.sample(mt, responses, Math.min(9, responses.length)));
    wseed += `-${seedargs[1]}-${seedargs[2]}`;
  } else {
    out = out.concat(Random.sample(mt, responses, Math.min(10, responses.length)));
  }
  let otp;
  switch (type) {
    case "text":
      otp = "```\n";
      let respMax = 0;
      let lenMax = 0;
      for (let i = 0; i < out.length; i++) {
        respMax = Math.max(respMax, out[i].response.length);
        lenMax = Math.max(lenMax, out[i].words.toString().length);
      }
      otp += "-".repeat(11 + respMax + lenMax) + "\n";
      for (let i = 0; i < out.length; i++) {
        let portion = `| ${String.fromCharCode(i + 65)} | ${out[i].response + " ".repeat(respMax - out[i].response.length)} | ${" ".repeat(lenMax - out[i].words.toString().length) + out[i].words.toString()} |\n`;
        otp += portion;
      }
      otp += "-".repeat(11 + respMax + lenMax) + "\n```";
      break;
    case "internal":
      otp = [];
      for (let i = 0; i < out.length; i++) {
        otp.push(out.id);
      }
      break;
    case "anondata":
      otp = [];
      for (let i = 0; i < out.length; i++) {
        otp.push([out[i].response, out[i].words]);
      }
      break;
  }
  return otp;
};