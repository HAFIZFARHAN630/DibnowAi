const express = require("express");
const router = express.Router();
const quranController = require("../controllers/quranController");
const { isAuthenticated, setUserData } = require("../middlewares/authMiddleware");

router.get("/quran", isAuthenticated, setUserData, quranController.getQuran);

module.exports = router;
