const express = require("express");
const router = express.Router();
const tasbeehController = require("../controllers/tasbeehController");
const { isAuthenticated, setUserData } = require("../middlewares/authMiddleware");

router.get("/tasbeeh", isAuthenticated, setUserData, tasbeehController.getTasbeeh);

module.exports = router;
