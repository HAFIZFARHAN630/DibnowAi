const express = require("express");
const router = express.Router();
const helpController = require("../controllers/helpController");

router.get("/Help", helpController.plan);

module.exports = router;
