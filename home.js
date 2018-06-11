const express = require("express");
const ejs = require("ejs");
const router = new express.Router();
const {catchAsync} = require("./utils.js");
const fetch = require("node-fetch");

router.get("/", catchAsync((req, res, next) => {
  res.render("home.ejs", {
    'user': req.client.users.get(req.query.id)
  })
}));

module.exports = router;
