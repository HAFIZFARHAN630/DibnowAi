const User = require("../models/user");

exports.allusers = async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!userId) {
      return res.redirect("/sign_in");
    }

    const User = require("../models/user");
    const PlanRequest = require("../models/planRequest");

    // Find the logged-in user
    const loggedInUser = await User.findById(userId);
    if (!loggedInUser) {
      return res.redirect("/sign_in");
    }

    const profileImagePath = loggedInUser.user_img || "/uploads/default.png";

    // Get pending manual payment requests with user details
    const manualPaymentRequests = await PlanRequest.find({ 
      status: 'Pending',
      invoiceStatus: 'Unpaid'
    })
    .populate('user', 'first_name last_name email phone_number transfer_id amount')
    .sort({ createdAt: -1 });

    console.log('📋 Manual Payment Requests Found:', manualPaymentRequests.length);
    if (manualPaymentRequests.length > 0) {
      console.log('📋 Request Details:', JSON.stringify(manualPaymentRequests, null, 2));
    } else {
      // Check all PlanRequests to debug
      const allRequests = await PlanRequest.find({}).populate('user');
      console.log('📋 Total PlanRequests in DB:', allRequests.length);
      allRequests.forEach((req, i) => {
        console.log(`${i+1}. Plan: ${req.planName}, Status: ${req.status}, Invoice: ${req.invoiceStatus}, User: ${req.user ? req.user.email : 'N/A'}`);
      });
    }

    // Format data for display - convert GBP to PKR for admin view
    const users = manualPaymentRequests.map(req => {
      const baseAmount = parseFloat(req.amount) || 0;
      const convertedAmount = baseAmount * 397.1863; // Convert to PKR

      return {
        id: req.user._id,
        first_name: req.user.first_name,
        last_name: req.user.last_name,
        email: req.user.email,
        phone_number: req.user.phone_number,
        transfer_id: req.user.transfer_id || 'N/A',
        amount: baseAmount, // Keep base amount for calculations
        displayAmount: convertedAmount.toFixed(2), // PKR amount for display
        plan_name: req.planName,
        planRequestId: req._id
      };
    });

    // Get notification data for admin
    let notifications = [];
    let unreadCount = 0;
    if (loggedInUser.role === "admin") {
      const Notification = require("../models/notification");
      notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
      unreadCount = await Notification.countDocuments({ isRead: false });
    }

    res.render("Request/request", { 
      message: "",
      email: loggedInUser.email,
      profileImagePath,
      firstName: loggedInUser.first_name,
      isUser: loggedInUser.role === "user",
      users: users,
      notifications: notifications,
      unreadCount: unreadCount
    });
  } catch (error) {
    console.error("Error fetching request data:", error.message);
    return res.render("Request/request", {
      users: [],
      notifications: [],
      unreadCount: 0,
      error_msg: "Unable to load request data. Please try again."
    });
  }
};

// Accept manual payment and send notification
exports.acceptManualPayment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;

    if (!userId) {
      return res.status(400).json({ success: false, message: "User ID is required." });
    }

    const Notification = require("../models/notification");

    const user = await User.findById(userId).select('first_name');
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Create notification for user
    const notification = new Notification({
      userId: userId,
      userName: user.first_name,
      action: "Manual Payment Verified",
      message: message || "Your payment has been verified. Please wait, your plan will activate within 1–2 hours.",
      isRead: false
    });

    await notification.save();

    // Emit notification via Socket.IO to specific user only
    if (req.app.locals.notificationService) {
      req.app.locals.notificationService.io.emit('userNotification', {
        userId: userId,
        notification: notification
      });
    }

    res.json({ success: true, message: "Notification sent successfully." });
  } catch (error) {
    console.error("Error sending notification:", error.message);
    res.status(500).json({ success: false, message: "Failed to send notification." });
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
