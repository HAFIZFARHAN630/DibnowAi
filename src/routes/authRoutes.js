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

// Sign-out routes
router.get("/logout", (req, res) => {
  console.log('GET /logout hit');
  logout(req, res);
});

router.post("/logout", (req, res) => {
  console.log('POST /logout hit');
  logout(req, res);
});

// Forgot password route
router.post("/forgot-password", forgotPassword);
router.post("/verify-otp", verifyOtpAndResetPassword);

module.exports = router;
