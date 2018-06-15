const express = require("express");
const ejs = require("ejs");
const router = new express.Router();
const {catchAsync} = require("./utils.js");
const fetch = require("node-fetch");

router.get("/:id", catchAsync((req, res, next) => {
  
  res.render("home.ejs", {
    'user': req.client.users.get(req.params.id)
  })
}));

module.exports = router;
