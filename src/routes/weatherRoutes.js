const express = require("express");
const router = express.Router();
const weatherController = require("../controllers/weatherController");
const { isAuthenticated, setUserData } = require("../middlewares/authMiddleware");

router.get("/weather", isAuthenticated, setUserData, weatherController.getWeather);

module.exports = router;