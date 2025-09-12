const express = require("express");
const router = express.Router();
const { allusers, deny } = require("../controllers/requestController");

router.get("/request", allusers);

router.post("/deny-user", deny);

module.exports = router;
