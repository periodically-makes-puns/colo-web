const express = require("express");
const ejs = require("ejs");
const fs = require("fs");
const crypto = require("crypto");
const router = new express.Router();
const {catchAsync} = require("./utils.js");
const fetch = require("node-fetch");

router.get("/:id", (req, res, next) => {
  const data = fs.readFileSync("./access.json");
  const json = JSON.parse(data);
  var sha256 = crypto.createHash("SHA256");
  sha256.update(req.params.id + req.query.s, "ascii");
  if (sha256.digest("hex") != json[req.params.id][2]) {
    res.status(403).send("Authentication details incorrect");
  }
  var user = req.client.users.get(req.params.id);
  if (!user) {
    res.status(404).send("Not Found");
  } else {
    res.render("home.ejs", {
      'user': user,
    });
  }
});

module.exports = router;
