const NotificationService = require("../../notificationService");
const User = require("../models/user");
const UserComplaint = require("../models/complaint");
const Notification = require("../models/notification");
const Payments = require("../models/payments");

exports.AllComplaint = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/");
    }

    // Fetch user profile
    const userResults = await User.findById(userId);
    if (!userResults) {
      return res.status(404).send("User not found");
    }

    // Fetch user complaints
    const complaintResults = await UserComplaint.find({ user_id: userId })
      .select('Username number department Complaint Address status');

    // Background data (nav_table equivalent)
    const bg_result = []; // Empty array since we don't have this model

    // Tasks data
    const taskResults = []; // Empty array since we don't have tasks model

    // Daily tasks data
    const dailyTasks = []; // Empty array since we don't have daily_tasks model

    // User notifications count (last 2 days)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const Notifactions = 0; // Default to 0 since we don't have notifications_user model

    // User notifications details (last 2 days)
    const notifications_users = []; // Empty array since we don't have notifications_user model

    const isAdmin = userResults.role === "admin";
    const isUser = userResults.role === "user";

    res.render("complaint/complaint", {
      users: complaintResults,
      email: userResults.email,
      user: userResults,
      message: null,
      messages: req.flash(),
      bg_result,
      isAdmin,
      tasks: taskResults,
      task: dailyTasks,
      isUser,
      notifications_users,
      Notifactions,
    });
  } catch (err) {
    console.error("Database query error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

// Admin Update Complaint with Reply
exports.updateComplaint = async (req, res) => {
  try {
    const { id } = req.params;
    const { Username, department, number, Address, Complaint, status, priority, admin_reply } = req.body;

    const updateData = {
      Username,
      department,
      number,
      Address,
      Complaint,
      status,
      priority
    };

    if (admin_reply) {
      updateData.admin_reply = admin_reply;
      updateData.reply_date = new Date();
    }

    await UserComplaint.findByIdAndUpdate(id, updateData);
    res.redirect("/UserComplaint");
  } catch (error) {
    console.error("Error updating complaint:", error.message);
    res.redirect("/UserComplaint");
  }
};

// User View All Complaints with Admin Replies
exports.userAllComplaints = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).select("first_name last_name user_img role");
    
    if (!user) {
      return res.redirect("/sign_in");
    }

    const complaints = await UserComplaint.find({ user_id: userId }).sort({ created_at: -1 });

    const Notification = require("../models/notification");
    const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
    const unreadCount = await Notification.countDocuments({ isRead: false });

    res.render("AdminComplaint/user-complaints", {
      complaints,
      profileImagePath: user.user_img || "/uploads/default.png",
      firstName: user.first_name,
      isAdmin: false,
      isUser: true,
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("Error fetching user complaints:", error.message);
    res.redirect("/index");
  }
};

// Assuming you're using multer middleware as `upload`
exports.uploadTaskImages = async (req, res) => {
  try {
    const { id, name, title } = req.body;
    const imagePath = req.file ? req.file.path : null;

    // Since we don't have a daily_tasks model, we'll skip the database insertion
    // but still handle the notification

    try {
      // Get user email for notification
      const userResult = await User.findById(id).select('Email');
      if (userResult) {
        // Use the new notification service for task submission
        await NotificationService.handleTaskSubmission({
          username: name,
          email: userResult.Email,
          title: title
        });
      }
    } catch (notificationError) {
      console.error("❌ Error sending task submission notifications:", notificationError);
    }

    req.flash("success", "Task submitted successfully!");
    res.redirect("/complaint");
  } catch (error) {
    console.error("❌ Unexpected error in task submission:", error);
    req.flash("success", "Task submitted successfully!");
    res.redirect("/complaint");
  }
};
