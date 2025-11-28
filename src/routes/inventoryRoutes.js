const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { getInventory, getSoldItemsAPI } = require("../controllers/inventoryController");

router.get("/inventory", getInventory);
router.get("/api/sold-items", getSoldItemsAPI);

module.exports = router;
