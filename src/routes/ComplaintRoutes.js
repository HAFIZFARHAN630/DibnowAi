const express = require("express");
const router = express.Router();
const { upload } = require("../config/cloudinary");
const { isAuthenticated } = require("../middlewares/authMiddleware");
const {
  AllComplaint,
  uploadTaskImages,
  userAllComplaints,
  updateComplaint,
} = require("../controllers/ComplaintController");

// get the complaint of the user
router.get("/complaint", AllComplaint);

router.get("/user/all-complaints", isAuthenticated, userAllComplaints);

router.post("/UserComplaint/update/:id", isAuthenticated, updateComplaint);

router.post('/upload-task', upload.single('images'), uploadTaskImages);

router.post('/complaint', isAuthenticated, async (req, res) => {
  try {
    const { username, number, department, Address, Complaint } = req.body;
    const newComplaint = new (require('../models/complaint'))({
      user_id: req.session.userId,
      Username: username,
      number,
      department,
      Address,
      Complaint,
      status: 'Pending'
    });
    await newComplaint.save();
    res.redirect('/user/all-complaints');
  } catch (error) {
    console.error('Error creating complaint:', error);
    res.redirect('/user/all-complaints');
  }
});

module.exports = router;
