const express = require("express");
const router = express.Router();
const { checkPermission } = require("../middlewares/permissionMiddleware");
const helpController = require("../controllers/helpController");

router.get("/Help", checkPermission('tickets'), helpController.plan);

module.exports = router;
