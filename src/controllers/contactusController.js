const moment = require("moment");
const NotificationService = require("../../notificationService");
const User = require("../models/user");
const Contactus = require("../models/contactus");
const UserComplaint = require("../models/complaint");
const Notification = require("../models/notification");
const Payments = require("../models/payments");

exports.profile = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      console.error("User ID is missing in the session.");
      return res.redirect("/");
    }

    // Fetch user profile
    const userResults = await User.findById(userId);
    if (!userResults) {
      return res.status(404).send("User not found");
    }

    // Fetch background data (data_entries equivalent)
    const password_data = []; // Empty array since we don't have this model

    // Fetch total notifications count
    const totalNotifactions = await Notification.countDocuments();

    // Fetch nav table data
    const bg_result = []; // Empty array since we don't have this model

    // Format the created_at date
    userResults.created_at = moment(userResults.created_at).format("YYYY-MM-DD");

    // Fetch user notifications count (last 2 days)
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

    const Notifactions = 0; // Default to 0 since we don't have notifications_user model

    // Fetch user notifications details (last 2 days)
    const notifications_users = []; // Empty array since we don't have notifications_user model

    const isAdmin = userResults.role === "admin";
    const isUser = userResults.role === "user";

    // Fetch user payments
    const paymentResults = await Payments.find({ user_id: userId });

    // Format payment dates
    paymentResults.forEach((payment) => {
      payment.created_at = moment(payment.created_at).format("YYYY-MM-DD");
    });

    // Flash messages
    const successMsg = req.flash("success");

    // Set profile image path
    const profileImagePath = userResults.user_img || '/img/dumi img.png';

    res.render("contactUs/contactUs", {
      user: userResults,
      message: null,
      isAdmin,
      payments: paymentResults,
      bg_result,
      password_data,
      messages: {
        success: successMsg.length > 0 ? successMsg[0] : null,
      },
      totalNotifactions,
      isUser,
      notifications_users,
      Notifactions,
      profileImagePath,
    });
  } catch (err) {
    console.error("Database query error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.feedback = async (req, res) => {
  try {
    const { rating, feedback_text, first_name, last_name, email } = req.body;

    const newFeedback = new Contactus({
      rating,
      feedback_text,
      first_name,
      last_name,
      email
    });

    await newFeedback.save();

    req.flash("success", "Thank you for your Feedback!");
    res.redirect("/contactus");
  } catch (err) {
    console.error("Error inserting feedback:", err);
    return res.status(500).send("Database error");
  }
};

exports.AllComplaint = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/");
    }

    // Fetch user profile data
    const userResults = await User.findById(userId).select('user_img role');
    if (!userResults) {
      return res.status(404).send("User not found");
    }

    // Fetch user complaints
    const complaintResults = await UserComplaint.find({ user_id: userId })
      .select('username number department Complaint Address status');

    // Background data (nav_table equivalent)
    const bg_result = []; // Empty array since we don't have this model

    const isAdmin = userResults.role === "admin";

    // Set profile image path
    const profileImagePath = userResults.user_img || '/img/dumi img.png';

    res.render("contactUs/contactUs", {
      users: complaintResults,
      user: userResults,
      message: null,
      bg_result,
      isAdmin,
      profileImagePath,
    });
  } catch (err) {
    console.error("Database query error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

exports.AdminUserComplaints = async (req, res) => {
  try {
    // Fetch all complaints for admin view
    const allComplaints = await UserComplaint.find({})
      .populate('user_id', 'first_name last_name email')
      .sort({ created_at: -1 });

    // Format dates
    allComplaints.forEach((complaint) => {
      complaint.created_at_formatted = moment(complaint.created_at).format("YYYY-MM-DD HH:mm");
    });

    // Set profile image path for admin
    const profileImagePath = '/img/dumi img.png';

    // Get selected department from query params for filtering
    const selectedDepartment = req.query.department || '';

    // Create a default user object for admin view to prevent template errors
    const adminUser = {
      id: null,
      department: null,
      first_name: 'Admin',
      last_name: 'User',
      email: 'admin@system.com'
    };

    res.render("AdminComplaint/AdminComplaint", {
      complaints: allComplaints,
      title: "User Complaints",
      profileImagePath,
      selectedDepartment,
      // Map complaints to users for the template structure
      users: allComplaints,
      user: adminUser, // Default admin user object to prevent template errors
      message: null,
      bg_result: [],
      isAdmin: true,
      tasks: [],
      task: [],
      isUser: false,
      notifications_users: [],
      Notifactions: 0,
      messages: {}
    });
  } catch (err) {
    console.error("Database query error:", err);
    return res.status(500).send("Internal Server Error");
  }
};

// Inserting a new complaint
exports.UserComplaint = async (req, res) => {
  try {
    const { username, number, department, Complaint, Address } = req.body;
    const userId = req.session.userId;

    if (!userId) {
      return res.status(400).send("User not logged in");
    }

    // Check if user exists
    const userExists = await User.findById(userId).select('Email');
    if (!userExists) {
      return res.status(400).send("Invalid user ID. User does not exist.");
    }

    const userEmail = userExists.Email;

    // Create new complaint
    const newComplaint = new UserComplaint({
      username,
      number,
      department,
      Complaint,
      Address,
      user_id: userId
    });

    await newComplaint.save();

    try {
      // Use the new notification service
      await NotificationService.handleNewComplaint({
        username: username,
        email: userEmail,
        phone: number,
        complaint: Complaint
      });

      req.flash("success", "Your complaint has been submitted");
      res.redirect("/contactUs");
    } catch (notificationError) {
      console.error("❌ Error sending notifications:", notificationError);
      req.flash("success", "Your complaint has been submitted");
      res.redirect("/contactUs");
    }
  } catch (err) {
    console.error("Database query error:", err);
    return res.status(500).send("Internal Server Error");
  }
};
