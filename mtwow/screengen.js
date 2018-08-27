/*jshint esversion: 6 */

const fs = require("fs");
const Random = require("random-js");
var mt = Random.engines.mt19937();

module.exports = (seed, type) => {
  let seedargs;
  try {
    seedargs = seed.split("-");
  } catch (e) {
    seedargs = [];
  }
  let json = JSON.parse(fs.readFileSync("./mtwow/mtwow.json"));
  let out = [];
  mt.autoSeed();
  let rseed = parseInt(seedargs[0]) || Random.integer(1, 11881376)(mt);
  mt.seed(rseed);
  wseed = rseed.toString();
  if (seedargs[1] != undefined && seedargs[2] != undefined) {
    let need = json.responses.findIndex((val) => {
      return val[0] == seedargs[1] && val[1] == parseInt(seedargs[2]);
    });
    out.push(json.responses[need]);
    let responses = JSON.parse(JSON.stringify(json.responses));
    responses.splice(need, 1);
    out = out.concat(Random.sample(mt, responses, Math.min(9, responses.length)));
    wseed += `-${seedargs[1]}-${seedargs[2]}`;
  } else {
    out = out.concat(Random.sample(mt, json.responses, Math.min(10, json.responses.length)));
  }
  let otp;
  switch (type) {
    case "text":
      otp = "```\n";
      let respMax = 0;
      let lenMax = 0;
      for (let i = 0; i < out.length; i++) {
        respMax = Math.max(respMax, out[i][2].length);
        lenMax = Math.max(lenMax, out[i][3].toString().length);
      }
      otp += "-".repeat(11 + respMax + lenMax) + "\n";
      for (let i = 0; i < out.length; i++) {
        let portion = `| ${String.fromCharCode(i + 65)} | ${out[i][2] + " ".repeat(respMax - out[i][2].length)} | ${" ".repeat(lenMax - out[i][3].toString().length) + out[i][3].toString()} |\n`;
        otp += portion;
      }
      otp += "-".repeat(11 + respMax + lenMax) + "\n```";
      break;
    case "internal":
      otp = [];
      for (let i = 0; i < out.length; i++) {
        otp.push(json.responses.findIndex((val) => {
          for (let j = 0; j < 4; j++) {
            if( val[j] != out[i][j]) return false;
          }
          return true;
        }));
      }
      break;
    case "anondata":
      otp = [];
      for (let i = 0; i < out.length; i++) {
        otp.push([out[i][2], out[i][3]]);
      }
      break;
  }
  return otp;
};