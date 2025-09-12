const express = require("express");
const router = express.Router();
const {
  signup,
  signin,
  logout,
  forgotPassword,
  verifyOtpAndResetPassword,
} = require("../controllers/authController");

// Serve sign-up form
router.get("/", (req, res) => {
  res.render("Sigin/sign_in", { message: null });
});

// Serve sign-in form
router.get("/sign_in", (req, res) => {
  res.render("Sigin/sign_in", { message: null });
});

// Sign-up route
router.post("/sign_up", signup);

// Serve sign-up form
router.get("/sign_up", (req, res) => {
  res.render("Sigin/sign_up", { message: null });
});

// Sign-in route
router.post("/sign_in", signin);

// Sign-out route
router.get("/logout", logout);

// Forgot password route
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtpAndResetPassword);

module.exports = router;
