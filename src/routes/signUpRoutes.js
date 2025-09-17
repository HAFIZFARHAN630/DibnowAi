const express = require("express");
const router = express.Router();
const {
  signup,
  verifySignupOtp,
  autoVerifySignup,
} = require("../controllers/authController");

// Serve sign-up form
router.get("/sign_up", (req, res) => {
  res.render("Sigin/sign_up", { message: null });
});

// Sign-up route
router.post("/sign_up", signup);
router.post("/verify-signup-otp", verifySignupOtp);
router.get("/verify-email", autoVerifySignup);

module.exports = router;