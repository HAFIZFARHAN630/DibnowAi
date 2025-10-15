const User = require("../models/user");
const AddUser = require("../models/adduser");
const bcrypt = require("bcryptjs");

// Get all users
exports.allusers = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User ID is missing in the session.");
      return res.redirect("/sign_in");
    }

    // Fetch user and addusers concurrently
    const [user, addUsers] = await Promise.all([
      User.findById(userId).select(
        "first_name last_name phone_number email company address user_img country currency plan_name subscription_date status denial_reason plan_limit created_at role"
      ),
      AddUser.find({ user_id: userId })
    ]);

    if (!user) {
      return res.redirect("/sign_in");
    }

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
    let stockLimit = user.plan_limit || 0;
    const isAdmin = user.role === "admin";
    const isUser = user.role === "user";
    const userCount = addUsers.length;

    let success_msg = "";
    let error_msg = "";
    
    if (userCount >= stockLimit) {
      console.error("User stock limit exceeded for the current plan.");
      error_msg = `You have reached your stock limit of ${stockLimit} users for your plan (${user.plan_name}).`;
    }

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
      users: addUsers,
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
      reson: user.denial_reason,
    });
  } catch (error) {
    console.error("Error fetching settings data:", error.message);
    return res.render("Setting/Setting", {
      users: [],
      error_msg: "Unable to load settings. Please try again.",
      success_msg: ""
    });
  }
};

// update data
exports.updatedata = async (req, res) => {
  try {
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

    await User.findByIdAndUpdate(userId, {
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      email,
      company,
      country,
      currency
    });

    req.flash("success_msg", "Profile updated successfully!");
    res.redirect("/Setting");
  } catch (error) {
    console.error("Error updating profile:", error.message);
    req.flash("error_msg", "Failed to update profile. Please try again.");
    res.redirect("/Setting");
  }
};

exports.api = async (req, res) => {
  try {
    const { currency, country } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.send("User not authenticated.");
    }

    await User.findByIdAndUpdate(userId, { currency, country });
    console.log("User updated successfully");
    res.send("Currency and country updated successfully!");
  } catch (error) {
    console.error("Error updating data:", error.message);
    res.send("Failed to update user.");
  }
};

// Update user password
exports.updatePassword = async (req, res) => {
  try {
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
    const user = await User.findById(userId);
    if (!user) {
      req.flash("error_msg", "User not found.");
      return res.redirect("/Setting");
    }

    // Compare the current password with the stored hash
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      req.flash("error_msg", "Incorrect current password.");
      return res.redirect("/Setting");
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update the password in the database
    await User.findByIdAndUpdate(userId, { password: hashedPassword });
    
    req.flash("success_msg", "Password updated successfully.");
    res.redirect("/Setting");
  } catch (error) {
    console.error("Error updating password:", error.message);
    req.flash("error_msg", "An error occurred. Please try again.");
    res.redirect("/Setting");
  }
};