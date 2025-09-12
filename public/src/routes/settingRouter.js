const express = require("express");
const router = express.Router();
const {
  allusers,
  updatedata,
  api,
  updatePassword,
} = require("../controllers/settingController");

// Routes
router.get("/Setting", allusers);

router.post("/Setting/update", updatedata);

router.post("/Setting", api);

// Update Password
router.post("/sett", updatePassword);

module.exports = router;
