const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { getInventory } = require("../controllers/inventoryController");

router.get("/inventory", getInventory);

module.exports = router;
