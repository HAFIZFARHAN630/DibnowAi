const express = require("express");
const db = require("../config/db");
const router = express.Router();
const { allusers, accept } = require("../controllers/indexController");

router.get("/index", allusers);

// New route to accept user
router.post("/accept-user", accept);

module.exports = router;
