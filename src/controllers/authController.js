// authController.js
const User = require("../models/user");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

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

      // Create new user
      const newUser = new User({
        first_name,
        last_name,
        email,
        phone_number,
        password: hashedPassword,
        company,
        address,
        postcode
      });

      await newUser.save();

      // Success
      res.render("Sigin/sign_in", {
        message: "Account created successfully. Please sign in.",
      });
    } catch (error) {
      console.error("Error creating account:", error.message);
      return res.render("Sigin/sign_up", {
        message: "An error occurred while creating your account. Please try again.",
      });
    }
  },
];

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

      return res.redirect("/index");
    } catch (error) {
      console.error("Login error:", error.message);
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
    const otpExpiry = Date.now() + 600000;

    // Update user with OTP and expiry
    await User.findOneAndUpdate(
      { email },
      { otp: otp.toString(), otp_expiry: new Date(otpExpiry) }
    );

    console.log("OTP updated in the database for email:", email);

    // Send OTP to user's email
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "hamzahayat3029@gmail.com",
        pass: "ceud ztsg vqwr lmtl",
      },
    });

    const mailOptions = {
      from: "hamzahayat3029@gmail.com",
      to: email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is: ${otp}`,
    };

    transporter.sendMail(mailOptions, (err, info) => {
      if (err) {
        console.error("Email sending error:", err.message);
        return res.render("Sigin/sign_in", {
          message: "Error sending OTP email. Please try again.",
        });
      }
      res.render("Sigin/verify_otp", {
        email,
        message: "OTP Code Sent To Your Email.",
      });
    });
  } catch (error) {
    console.error("Forgot password error:", error.message);
    return res.render("Sigin/sign_in", {
      message: "An error occurred. Please try again.",
    });
  }
};

exports.verifyOtpAndResetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    // Check if OTP is valid and not expired
    const user = await User.findOne({
      email,
      otp,
      otp_expiry: { $gt: new Date() }
    });

    if (!user) {
      console.log("Invalid or expired OTP. No matching record found.");
      return res.render("Sigin/verify_otp", {
        email,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password and clear OTP fields
    await User.findOneAndUpdate(
      { email },
      {
        password: hashedPassword,
        otp: null,
        otp_expiry: null
      }
    );

    res.render("Sigin/sign_in", {
      message: "Password reset successfully. Please sign in.",
    });
  } catch (error) {
    console.error("Error updating password:", error.message);
    return res.render("Sigin/verify_otp", {
      email: req.body.email,
      message: "An error occurred. Please try again.",
    });
  }
};
// forget password // forget password

// Logout
exports.logout = (req, res) => {
  console.log('Logout route hit:', req.method, req.url);
  console.log('Request body:', req.body);
  
  const reason = req.body.reason || 'User logout';
  
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.redirect("/index");
    }
    res.clearCookie("connect.sid");
    res.clearCookie("auth_token");
    
    // Log the logout reason for audit purposes
    console.log(`User logged out. Reason: ${reason}`);
    
    res.render("Sigin/sign_in", {
      message: "You have been logged out successfully.",
    });
  });
};
