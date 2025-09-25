const User = require("../models/user");
const Payments = require("../models/payments");
const Contactus = require("../models/contactus");
const Notification = require("../models/notification");
const moment = require("moment");

exports.profile = async (req, res) => {
  try {
    const userId = req.session.userId;

    if (!userId) {
      console.error("User ID is missing in the session.");
      return res.redirect("/");
    }

    // Get user profile
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).send("User not found");
    }

    user.created_at = moment(user.created_at).format("YYYY-MM-DD");
    const isAdmin = user.role === "admin";
    const isUser = user.role === "user";

    // Background data (nav_table equivalent) - using empty array like other controllers
    const bg_result = [];

    // Get user payments
    const paymentResults = await Payments.find({ user: userId });
    paymentResults.forEach((payment) => {
      payment.created_at = moment(payment.created_at).format("YYYY-MM-DD");
    });

    // Get all feedback
    const feedbackResults = await Contactus.find({});

    // Get total notifications count (unread, last 2 days)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    
    const totalNotifactions = await Notification.countDocuments({
      isRead: false,
      timestamp: { $gte: twoDaysAgo }
    });

    // Get unread notifications from last 2 days
    const password_datass = await Notification.find({
      isRead: false,
      timestamp: { $gte: twoDaysAgo }
    }).sort({ timestamp: -1 });

    const successMsg = req.flash("success");

    // Set profile image path
    const profileImagePath = user.user_img || "/img/dumi img.png";

    res.render("ReviewAdmin/review", {
      user,
      message: null,
      isAdmin,
      payments: paymentResults,
      bg_result,
      feedback: feedbackResults,
      totalNotifactions,
      password_datass,
      isUser,
      profileImagePath,
      firstName: user.first_name,
      email: user.email,
      messages: {
        success: successMsg.length > 0 ? successMsg[0] : null,
      },
    });
  } catch (err) {
    console.error("Database error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.review = async (req, res) => {
  try {
    const feedbackId = req.params.id;
    const result = await Contactus.findByIdAndDelete(feedbackId);
    
    if (!result) {
      console.error("Feedback not found:", feedbackId);
      return res.status(404).send("Feedback not found");
    }
    
    req.flash("success", "Feedback deleted successfully!");
    res.redirect("/review");
  } catch (err) {
    console.error("Error deleting feedback:", err);
    return res.status(500).send("Internal Server Error");
  }
};
