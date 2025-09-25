// authController.js
const User = require("../models/user");
const PlanRequest = require("../models/planRequest");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
  const { sendConfirmationEmail, sendForgotPasswordEmail, sendLogoutEmail } = require("../../emailService");
// Signup
exports.signup = [
  async (req, res) => {
    try {
      const {
        first_name,
        last_name,
        email,
        phone_number,
        password,
        company,
        address,
        postcode,
      } = req.body;

      // Check if email already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.render("Sigin/sign_up", {
          message: "Email already exists. Please choose another one.",
        });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(password, 10);
      // Generate OTP
      const otp = Math.floor(100000 + Math.random() * 900000);
      const otpExpiry = Date.now() + 600000; // 10 mins expiry

      // Create new user
      const newUser = new User({
        first_name,
        last_name,
        email,
        phone_number,
        password: hashedPassword,
        company,
        address,
        postcode,
        isVerified: false,   //  new field
      otp: otp.toString(),
      otp_expiry: new Date(otpExpiry),
      });

      await newUser.save();

      // Auto-assign Free Trial plan
      const trialExpiryDate = new Date();
      trialExpiryDate.setDate(trialExpiryDate.getDate() + 7); // 7 days trial

      const freeTrialPlan = new PlanRequest({
        user: newUser._id,
        planName: "Free Trial",
        status: "Active",
        startDate: new Date(),
        expiryDate: trialExpiryDate,
        invoiceStatus: "Unpaid",
        amount: 0,
        description: "Free Trial Plan - 7 days access"
      });

      await freeTrialPlan.save();
      console.log(`Free Trial plan assigned to user: ${newUser.email}`);

      // Create notification for registration
      if (req.app.locals.notificationService) {
        await req.app.locals.notificationService.createNotification(
          newUser._id,
          newUser.first_name,
          "Register"
        );
      }
   try {
     await sendConfirmationEmail(email, first_name, otp);
     console.log("Signup OTP sent to:", email);
   } catch (mailError) {
     console.error("Failed to send signup OTP:", mailError.message);
   }

    // Redirect to login page
    return res.redirect("/sign_in?message=Account created successfully! Please check your email for confirmation and login.");

  } catch (error) {
    console.error("Signup error:", error);
    return res.render("Sigin/sign_up", {
      message: "An error occurred while creating your account. Please try again.",
    });
     
    }
  },
];
exports.verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;

    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() }, // not expired
    });

    if (!user) {
      return res.render("Sigin/signup_verify_otp", {
        email,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    // Mark user as verified
    user.isVerified = true;
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    return res.render("Sigin/sign_in", {
      message: "Your email has been verified. You can now sign in.",
    });

  } catch (error) {
    console.error("Signup OTP verification error:", error);
    return res.render("Sigin/signup_verify_otp", {
      email: req.body.email,
      message: "An error occurred. Please try again.",
    });
  }
};
// Auto Verify via Link (when clicking the email button)
exports.autoVerifySignup = async (req, res) => {
  try {
    const { email, otp } = req.query;

    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() }
    });

    if (!user) {
      return res.render("Sigin/signup_verify_otp", {
        email,
        message: "Invalid or expired OTP. Please try again."
      });
    }

    //  Verify the user
    user.isVerified = true;
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    return res.render("Sigin/sign_in", {
      message: "Your email has been verified. You can now sign in."
    });
  } catch (err) {
    console.error("Auto verification error:", err);
    return res.render("Sigin/signup_verify_otp", {
      email: req.query.email,
      message: "An error occurred. Please try again."
    });
  }
};

// Signin
exports.signin = [
  async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await User.findOne({ email });
      if (!user) {
        return res.render("Sigin/sign_in", { message: "Invalid email." });
      }

      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.render("Sigin/sign_in", { message: "Invalid password." });
      }

      req.session.userId = user._id;
      const token = jwt.sign({ id: user._id }, "your_jwt_secret", {
        expiresIn: "1h",
      });

      res.cookie("auth_token", token, { httpOnly: true });

      // Check if user has a plan, if not assign Free Trial
      const existingPlan = await PlanRequest.findOne({ user: user._id });
      if (!existingPlan) {
        const trialExpiryDate = new Date();
        trialExpiryDate.setDate(trialExpiryDate.getDate() + 7); // 7 days trial

        const freeTrialPlan = new PlanRequest({
          user: user._id,
          planName: "Free Trial",
          status: "Active",
          startDate: new Date(),
          expiryDate: trialExpiryDate,
          invoiceStatus: "Unpaid",
          amount: 0,
          description: "Free Trial Plan - 7 days access"
        });

        await freeTrialPlan.save();
        console.log(`Free Trial plan assigned to existing user: ${user.email}`);
      }

      // Create notification for login
      if (req.app.locals.notificationService) {
        console.log(`Calling notification service for login: ${user.first_name}`);
        await req.app.locals.notificationService.createNotification(
          user._id,
          user.first_name,
          "Login"
        );
      } else {
        console.log('Notification service not available');
      }

      return res.redirect("/index");
    } catch (error) {
      console.error("Login error:", error);
      return res.render("Sigin/sign_in", {
        message: "An error occurred during login. Please try again."
      });
    }
  },
];

// forget password // forget password
// Forgot Password - Send OTP
  exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    // Check if email exists
    const user = await User.findOne({ email });
    if (!user) {
      return res.render("Sigin/sign_in", {
        message: "Email not found. Please enter a valid email.",
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = Date.now() + 600000; // 10 mins

    // Save OTP + expiry
    user.otp = otp.toString();
    user.otp_expiry = new Date(otpExpiry);
    await user.save();

    console.log("Forgot password OTP generated for:", email);

    // Send OTP email (with reset link)
    try {
      await sendForgotPasswordEmail(email, user.first_name || "User", otp);
      console.log("Forgot password OTP sent to:", email);
    } catch (mailError) {
      console.error("Failed to send forgot password OTP:", mailError.message);
    }

    // Redirect to pre-filled OTP form
    return res.redirect(`/forgot-password?email=${email}&otp=${otp}`);
  } catch (error) {
    console.error("Forgot password error:", error);
    return res.render("Sigin/sign_in", {
      message: "An error occurred. Please try again.",
    });
  }
};
exports.renderResetPasswordForm = async (req, res) => {
  try {
    const { email, otp } = req.query;

    // Check if user exists and OTP is valid
    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() },
    });

    if (!user) {
      return res.render("Sigin/signup_verify_otp", {
        email,
        message: "Invalid or expired OTP. Please request a new one.",
      });
    }

    // Render reset password form with hidden OTP + email
    return res.render("Sigin/reset_password", {
      email,
      otp, // send OTP to form
      message: "Enter your new password below.",
    });
  } catch (error) {
    console.error("Error rendering reset password form:", error);
    return res.render("Sigin/signup_verify_otp", {
      email: req.query.email,
      message: "An error occurred. Please try again.",
    });
  }
};
exports.verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Validate OTP
    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() },
    });

    if (!user) {
      return res.render("Sigin/sign_in", {
        email,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    // If OTP is correct but no newPassword yet → show reset form
    if (!newPassword) {
      return res.render("Sigin/reset_password", {
        email,
        otp,
        message: "Enter your new password below.",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Save new password + clear OTP
    user.password = hashedPassword;
    user.otp = null;
    user.otp_expiry = null;
    await user.save();

    return res.render("Sigin/sign_in", {
      message: "Password reset successfully. Please log in.",
    });
  } catch (error) {
    console.error("Error resetting password:", error);
    return res.render("Sigin/signup_verify_otp", {
      email: req.body.email,
      message: "An error occurred. Please try again.",
    });
  }
};

// forget password // forget password

// Logout
 exports.logout = async (req, res) => {
   console.log("Logout route hit:", req.method, req.url);
   console.log("Request body:", req.body);
 
   try {
     const reason = req.body.reason; // now required
     const sessionUserId = req.session.userId;
     const user = sessionUserId ? await User.findById(sessionUserId) : null;
 
     if (!user) {
       return res.render("Sigin/sign_in", {
         message: "Cannot determine user email. Logout cancelled.",
       });
     }
 
     const email = user.email;
     const name = user.first_name || "User";
 
     req.session.destroy(async (err) => {
       if (err) {
         console.error("Error destroying session:", err);
         return res.redirect("/index");
       }
 
       res.clearCookie("connect.sid");
       res.clearCookie("auth_token");
        // Create notification for logout
     const userId = sessionUserId;
     const userName = name;
     if (req.app.locals.notificationService && userId) {
       await req.app.locals.notificationService.createNotification(
         userId,
         userName,
         "Logout"
       );}
 
       // Send logout email
       await sendLogoutEmail(email, name, reason);
 
       console.log(`User logged out. Reason: ${reason}`);
 
       return res.render("Sigin/sign_in", {
         message: "You have been logged out successfully.",
       });
     });
   } catch (error) {
     console.error("Logout error:", error);
     return res.render("Sigin/sign_in", {
       message: "An error occurred during logout.",
     });
   }
 };
 
