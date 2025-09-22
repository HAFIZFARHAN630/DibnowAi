const express = require("express");
const router = express.Router();

// Import all route modules
const quranRoutes = require("./quranRoutes");
const prayerRoutes = require("./prayerRoutes");
const tasbeehRoutes = require("./tasbeehRoutes");
const weatherRoutes = require("./weatherRoutes");

// Use all route modules
router.use("/", quranRoutes);
router.use("/", prayerRoutes);
router.use("/", tasbeehRoutes);
router.use("/", weatherRoutes);

module.exports = router;