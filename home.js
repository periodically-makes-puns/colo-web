const express = require("express");
const ejs = require("ejs");
const router = new express.Router();

router.get("/", (req, res, next) => {
  res.render("home.ejs", {
    'user': req.client.users.get(req.params.id)
  })
});

module.exports = router;