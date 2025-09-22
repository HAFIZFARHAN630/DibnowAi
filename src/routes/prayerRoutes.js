const express = require("express");
const router = express.Router();
const prayerController = require("../controllers/prayerController");
const { isAuthenticated, setUserData } = require("../middlewares/authMiddleware");

router.get("/prayer", isAuthenticated, setUserData, prayerController.getPrayers);

module.exports = router;
