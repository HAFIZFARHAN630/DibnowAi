// authController.js
const db = require("../config/db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

// Signup
exports.signup = [
  (req, res) => {
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
    const checkEmailSql = "SELECT * FROM users WHERE email = ?";
    db.query(checkEmailSql, [email], (err, results) => {
      if (err) {
        console.error("Database error during email check:", err);
        return res.status(500).json({ 
          error: "Database error during email check.", 
          sqlMessage: err.sqlMessage 
        });
      }

      if (results.length > 0) {
        return res.render("Sigin/sign_up", {
          message: "Email already exists. Please choose another one.",
        });
      }

      // Hash the password
      bcrypt.hash(password, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Error hashing password:", err);
          return res.status(500).json({ 
            error: "Error hashing password.", 
            sqlMessage: err.message 
          });
        }

        // Insert user details with hashed password
        const insertSql = `
          INSERT INTO users 
          (first_name, last_name, email, phone_number, password, company, address, postcode) 
          VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `;
        db.query(insertSql, [
          first_name,
          last_name,
          email,
          phone_number,
          hashedPassword,
          company,
          address,
          postcode
        ], (err) => {
          if (err) {
            console.error("MySQL Insert Error:", err);
            return res.status(500).json({ 
              error: "Error creating account.", 
              sqlMessage: err.sqlMessage 
            });
          }

          // Success
          res.render("Sigin/sign_in", {
            message: "Account created successfully. Please sign in.",
          });
        });
      });
    });
  },
];

// Signin
exports.signin = [
  (req, res) => {
    const { email, password } = req.body;

    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], (err, result) => {
      if (err) {
        return res.status(500).json({ error: "Database error" });
      }

      if (result.length === 0) {
        return res.render("Sigin/sign_in", { message: "Invalid email." });
      }

      const user = result[0];
      bcrypt.compare(password, user.password, (err, isMatch) => {
        if (err || !isMatch) {
          return res.render("Sigin/sign_in", { message: "Invalid password." });
        }

        req.session.userId = user.id;
        const token = jwt.sign({ id: user.id }, "your_jwt_secret", {
          expiresIn: "1h",
        });

        res.cookie("auth_token", token, { httpOnly: true });

        if (user.role === "admin") {
          return res.redirect("/admin");
        }

        return res.redirect("/index");
      });
    });
  },
];

// forget password // forget password
// Forgot Password - Send OTP
exports.forgotPassword = (req, res) => {
  const { email } = req.body;

  // Check if email exists
  const checkEmailSql = "SELECT * FROM users WHERE email = ?";
  db.query(checkEmailSql, [email], (err, results) => {
    if (err) {
      return res
        .status(500)
        .json({ error: "Database error during email check." });
    }
    if (results.length === 0) {
      return res.render("Sigin/sign_in", {
        message: "Email not found. Please enter a valid email.",
      });
    }

    // Generate OTP
    const otp = Math.floor(100000 + Math.random() * 900000);
    const otpExpiry = Date.now() + 600000;

    // Store OTP and expiry in the database
    const updateOtpSql =
      "UPDATE users SET otp = ?, otp_expiry = ? WHERE email = ?";
    db.query(updateOtpSql, [otp, otpExpiry, email], (err) => {
      if (err) {
        return res.status(500).json({ error: "Error updating OTP." });
      }

      // Debugging: Log the database update
      console.log("OTP updated in the database for email:", email);

      // Send OTP to user's email
      const transporter = nodemailer.createTransport({
        service: "gmail",
        port: 587,
        secure: false,
        requireTLS: true,
        auth: {
          user: "hamzahayat3029@gmail.com", // Replace with your email
          pass: "ceud ztsg vqwr lmtl", // Replace with your email password
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
          return res.status(500).json({ error: "Error sending OTP email." });
        }
        res.render("Sigin/verify_otp", {
          email,
          message: "OTP Code Sent To Your Email.",
        });
      });
    });
  });
};

exports.verifyOtpAndResetPassword = (req, res) => {
  const { email, otp, newPassword } = req.body;

  // Check if OTP is valid and not expired
  const checkOtpSql =
    "SELECT * FROM users WHERE email = ? AND otp = ? AND otp_expiry = ?";
  db.query(checkOtpSql, [email, otp, Date.now()], (err, results) => {
    if (err) {
      console.error("Database error during OTP check:", err);
      return res
        .status(500)
        .json({ error: "Database error during OTP check." });
    }

    if (results.length === 0) {
      console.log("Invalid or expired OTP. No matching record found.");
      return res.render("Sigin/verify_otp", {
        email,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    // Hash the new password
    bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
      if (err) {
        console.error("Error hashing password:", err);
        return res.status(500).json({ error: "Error hashing password." });
      }

      // Update the password and clear OTP fields
      const updatePasswordSql =
        "UPDATE users SET password = ?, otp = NULL, otp_expiry = NULL WHERE email = ?";
      db.query(updatePasswordSql, [hashedPassword, email], (err) => {
        if (err) {
          console.error("Error updating password:", err);
          return res.status(500).json({ error: "Error updating password." });
        }
        res.render("Sigin/sign_in", {
          message: "Password reset successfully. Please sign in.",
        });
      });
    });
  });
};
// forget password // forget password

// Logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      console.error("Error destroying session:", err);
      return res.redirect("/index");
    }
    res.clearCookie("connect.sid");
    res.clearCookie("auth_token");
    res.render("Sigin/sign_in", {
      message: "You have been logged out successfully.",
    });
  });
};
