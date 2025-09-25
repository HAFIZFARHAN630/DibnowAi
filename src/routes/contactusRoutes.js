const express = require("express");
const router = express.Router();
const {
  profile,
  feedback,
  AllComplaint,
  UserComplaint,
  AdminUserComplaints,
} = require("../controllers/contactusController");

router.get("/contactUs", profile);
router.post("/submit-feedback", feedback);

// get the complaint of the user
router.get("/complaint", AllComplaint);

// post the complaint of the user
router.post("/complaint", UserComplaint);

// admin route to view all user complaints
router.get("/UserComplaint", AdminUserComplaints);

module.exports = router;
