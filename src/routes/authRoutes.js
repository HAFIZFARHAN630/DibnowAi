const express = require("express");
const router = express.Router();
const { sendConfirmationEmail, sendForgotPasswordEmail } = require("../../emailService");
const {
  signup,
  signin,
  logout,
  forgotPassword,
  verifyOtpAndResetPassword,
  verifySignupOtp,
  autoVerifySignup,
  renderResetPasswordForm,
} = require("../controllers/authController");


/* ------------------------
   LOGIN ROUTES
------------------------ */

// Serve login form
router.get("/", (req, res) => {
  res.render("Sigin/sign_in", { message: null });
});

router.get("/sign_in", (req, res) => {
  const message = req.query.message || null;
  res.render("Sigin/sign_in", { message });
});

// Redirect /login to /sign_in
router.get("/login", (req, res) => {
  res.redirect("/sign_in");
});

// Sign-in route
router.post("/sign_in", signin);

/* ------------------------
   SIGN-UP ROUTES
------------------------ */

// Serve signup form
router.get("/sign_up", (req, res) => {
  res.render("Sigin/sign_up", { message: null });
});

// Signup POST route
router.post("/sign_up", signup);

// Signup OTP verification
router.post("/verify-signup-otp", verifySignupOtp);
router.get("/verify-email", autoVerifySignup);

/* ------------------------
   LOGOUT ROUTES
------------------------ */
router.get("/logout", (req, res) => {
  console.log("GET /logout hit");
  logout(req, res);
});

router.post("/logout", (req, res) => {
  console.log("POST /logout hit");
  logout(req, res);
});

/* ------------------------
   FORGOT PASSWORD ROUTES
------------------------ */

// Request OTP via forgot password
router.post("/forgot-password", forgotPassword);

// Render reset password form (from email link)
router.get("/forgot-password", renderResetPasswordForm);

// Verify OTP & reset password
router.post("/verify-otp", verifyOtpAndResetPassword);

// OTP verification page
router.get("/verify-otp", (req, res) => {
  const email = req.query.email;
  res.render("Sigin/verify_otp", { email, message: null });
});

module.exports = router;
