const express = require("express");
const ejs = require("ejs");
const router = new express.Router();
const {catchAsync} = require("./utils.js");
const fetch = require("node-fetch");

router.get("/:id", catchAsync((req, res, next) => {
  
  var user = req.client.users.get(req.params.id);
  if (!user) {
    res.status(404).send("User not found");
  } else {
    res.render("home.ejs", {
      'user': user,
    });
  }
}));

module.exports = router;
