const express = require("express");
const router = express.Router();
const {
  profile,
  feedback,
  AllComplaint,
  UserComplaint,
} = require("../controllers/contactusController");
const { isAuthenticated, setUserData } = require("../middlewares/authMiddleware");

router.get("/contactUs", profile);
router.post("/submit-feedback", feedback);

// get the complaint of the user
router.get("/complaint", isAuthenticated, setUserData, AllComplaint);

// post the complaint of the user
router.post("/complaint", UserComplaint);

module.exports = router;
