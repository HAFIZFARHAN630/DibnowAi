const User = require("../models/user");

exports.allusers = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    // Fetch all users
    const allUsers = await User.find().select(
      "first_name last_name phone_number email company address user_img country currency role transfer_id amount"
    );

    // Find the logged-in user
    const loggedInUser = allUsers.find((user) => user._id.toString() === userId);
    if (!loggedInUser) {
      return res.redirect("/sign_in");
    }

    const profileImagePath = loggedInUser.user_img || "/uploads/default.png";

    // Filter out the logged-in user from the list
    const users = allUsers.filter((user) => user._id.toString() !== userId);

    res.render("Request/request", {
      message: "",
      profileImagePath,
      firstName: loggedInUser.first_name,
      isUser: loggedInUser.role === "user",
      users: users,
    });
  } catch (error) {
    console.error("Error fetching request data:", error.message);
    return res.render("Request/request", {
      users: [],
      error_msg: "Unable to load request data. Please try again."
    });
  }
};

// update the denial reason
exports.deny = async (req, res) => {
  try {
    const { userId, reason } = req.body;

    if (!userId || !reason) {
      req.flash("status_msg", "User ID and reason are required.");
      return res.redirect("/request");
    }

    const result = await User.findByIdAndUpdate(
      userId,
      { denial_reason: reason },
      { new: true }
    );

    if (!result) {
      req.flash("status_msg", "User not found or already denied.");
    } else {
      req.flash("status_msg", "denied");
    }

    res.redirect("/request");
  } catch (error) {
    console.error("Error denying user:", error.message);
    req.flash("status_msg", "An error occurred. Please try again.");
    res.redirect("/request");
  }
};
