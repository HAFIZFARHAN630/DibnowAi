const db = require("../config/db");
const bcrypt = require("bcryptjs");
const sql = require("../models/adduser");

// Get all users
exports.allusers = (req, res) => {
  const userId = req.session.userId;

  // Check if userId exists in session
  if (!userId) {
    console.error("User ID is missing in the session.");
    return res.redirect("/sign_in");
  }

  // Fetch user profile data and plan name
  const sqlProfile =
    "SELECT first_name, last_name, phone_number, email, company, address, user_img, country, currency, plan_name, subscription_date,  status,denial_reason, plan_limit, created_at , role FROM users WHERE id = ?";

  db.query(sqlProfile, [userId], (err, profileResult) => {
    if (err) {
      console.error("Database query error:", err);
      return res.status(500).send("Internal Server Error");
    }

    if (profileResult.length === 0) {
      return res.redirect("/sign_in"); // Redirect if user not found
    }

    const user = profileResult[0];

    // Check if subscription has expired
    const currentDate = new Date();
    const subscriptionDate = new Date(user.subscription_date);
    const expirationDate = new Date(subscriptionDate);
    expirationDate.setDate(expirationDate.getDate() + 30);
    if (currentDate > expirationDate) {
      req.flash(
        "error_msg",
        "Your 30-day subscription period has expired. Please renew your subscription."
      );
      return res.redirect("/pricing");
    }

    // Set stock limit based on the user's plan
    let stockLimit = 0;
    switch (user.plan_name) {
      case "FREE TRIAL":
      case "BASIC":
      case "STANDARD":
      case "PREMIUM":
        stockLimit = user.plan_limit === Infinity ? Infinity : user.plan_limit;
        break;
      default:
        stockLimit = 0;
        break;
    }

    // Count the current number of users in the addusers table
    const sqlCountUsers = "SELECT * FROM addusers WHERE user_id = ?";
    db.query(sqlCountUsers, [userId], (err) => {
      if (err) {
        console.error("Database query error (user count):", err);
        return res.status(500).send("Internal Server Error");
      }

      // Initialize success and error messages
      let success_msg = "";
      let error_msg = "";
      const isAdmin = user.role === "admin";
      const isUser = user.role === "user";

      // Check if the user has exceeded the stock limit
      const userCount = stockLimit.length;
      if (userCount >= stockLimit) {
        console.error("User stock limit exceeded for the current plan.");
        error_msg = `You have reached your stock limit of ${stockLimit} users for your plan (${user.plan_name}).`;
      }

      db.query(sql, [userId], (err, results) => {
        if (err) {
          console.error("Database query error:", err);
          return res.status(500).send("Internal Server Error");
        } else {
          // Render the page with user profile, messages, and addusers data
          res.render("Setting/Setting", {
            profileImagePath: user.user_img || "/uploads/default.png",
            firstName: user.first_name,
            lastName: user.last_name,
            phoneNumber: user.phone_number,
            email: user.email,
            company: user.company,
            address: user.address,
            country: user.country,
            currency: user.currency,
            users: results,
            user_id: userId,
            subscriptionDate,
            expirationDate,
            isAdmin,
            isUser,
            messages: req.flash(),
            stockLimit,
            plan_name: user.plan_name,
            created_at: user.created_at,
            userCount,
            success_msg,
            error_msg,
            status: user.status,
            //
            reson: user.denial_reason,
          });
        }
      });
    });
  });
};

// update data
exports.updatedata = (req, res) => {
  const userId = req.session.userId;
  const {
    firstName,
    lastName,
    phoneNumber,
    email,
    company,
    country,
    currency,
  } = req.body;
  const sql = ` UPDATE users SET first_name = ?, last_name = ?, phone_number = ?, email = ?, company = ?, country = ?, currency = ?  WHERE id = ?`;
  db.query(
    sql,
    [
      firstName,
      lastName,
      phoneNumber,
      email,
      company,
      country,
      currency,
      userId,
    ],
    (err, result) => {
      if (err) {
        console.error("Database update error:", err);
        return res.status(500).send("Failed to update profile");
      }
      res.redirect("/Setting");
    }
  );
};

exports.api = (req, res) => {
  const { currency, country } = req.body;

  // Update or insert data in the `users` table
  const sql = `
    INSERT INTO users (currency, country)
    VALUES (?, ?)
    ON DUPLICATE KEY UPDATE
    currency = VALUES(currency),
    country = VALUES(country)
  `;
  db.query(sql, [currency, country], (err, result) => {
    if (err) {
      console.error("Error updating data:", err);
      return res.send("Failed to update user.");
    }
    console.log("User updated:", result);
    res.send("Currency and country updated successfully!");
  });
};

// Update user password
exports.updatePassword = (req, res) => {
  const userId = req.session.userId;

  if (!userId) {
    req.flash("error_msg", "User not authenticated. Please log in again.");
    return res.redirect("/sign_in");
  }

  const { password, newPassword, confirmPassword } = req.body;

  // Validate required fields
  if (!password || !newPassword || !confirmPassword) {
    req.flash("error_msg", "All fields are required.");
    return res.redirect("/Setting");
  }

  // Check if new passwords match
  if (newPassword !== confirmPassword) {
    req.flash("error_msg", "New passwords do not match.");
    return res.redirect("/Setting");
  }

  // Fetch the user from the database
  const sql = "SELECT * FROM users WHERE id = ?";
  db.query(sql, [userId], (err, result) => {
    if (err) {
      console.error("Database query error:", err);
      req.flash("error_msg", "Internal Server Error");
      return res.redirect("/Setting");
    }
    if (result.length === 0) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/Setting");
    }

    const user = result[0];

    // Compare the current password with the stored hash
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) {
        console.error("Password comparison error:", err);
        req.flash("error_msg", "Internal Server Error");
        return res.redirect("/Setting");
      }
      if (!isMatch) {
        req.flash("error_msg", "Incorrect current password.");
        return res.redirect("/Setting");
      }

      // Hash the new password
      bcrypt.hash(newPassword, 10, (err, hashedPassword) => {
        if (err) {
          console.error("Password hashing error:", err);
          req.flash("error_msg", "Internal Server Error");
          return res.redirect("/Setting");
        }

        // Update the password in the database
        const updateSql = "UPDATE users SET password = ? WHERE id = ?";
        db.query(updateSql, [hashedPassword, userId], (err, updateResult) => {
          if (err) {
            console.error("Database update error:", err);
            req.flash("error_msg", "Internal Server Error");
            return res.redirect("/Setting");
          }
          req.flash("success_msg", "Password updated successfully.");
          res.redirect("/Setting");
        });
      });
    });
  });
};
