const express = require("express");
const router = express.Router();
const {
  admin,
  addAdmin,
  selectAddAdmin,
  deleteUser,
  updateUser,
  addUser,
  activeUsers,
  expiredUsers,
  settings,
  saveSettings,
  notificationSettingsPage,
  saveNotificationSettingsPage
} = require("../controllers/adminController");
const upload = require("../middlewares/uploadMiddleware");
const mongoose = require("mongoose");

const { getPaymentSettings, savePaymentSettings } = require("../controllers/adminPaymentController");
const { isAuthenticated, isAdmin } = require("../middlewares/authMiddleware");

// Manual Payment Notification - MUST BE BEFORE OTHER ROUTES
router.post("/admin/notify/manual-payment/:userId", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { userId } = req.params;
    const { message } = req.body;
    const Notification = require("../models/notification");
    const User = require("../models/user");
    
    const user = await User.findById(userId);
    if (!user) return res.json({ success: false, message: "User not found" });
    
    await Notification.create({
      userId: user._id,
      userName: user.first_name + " " + (user.last_name || ""),
      action: "Manual Payment Notification",
      message: message
    });
    
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.json({ success: false });
  }
});

// Admin page
router.get("/admin", isAuthenticated, isAdmin, admin);

// updte user
router.post("/admin/update/:id", isAuthenticated, isAdmin, updateUser);

// Delete a user
router.post("/admin/delete/:id", isAuthenticated, isAdmin, deleteUser);

// Add Admin page
router.get("/addadmin", isAuthenticated, isAdmin, (req, res, next) => {
  console.log("GET /addadmin route hit");
  selectAddAdmin(req, res, next);
});

// Add Admin action
router.post("/addadmin", isAuthenticated, isAdmin, addAdmin);

// Add User route
router.post("/admin/addUser", isAuthenticated, isAdmin, addUser);


// Payment Settings
router.get("/payment-settings", isAuthenticated, isAdmin, (req, res) => res.redirect('/admin/payment-settings'));
router.get("/admin/payment-settings", isAuthenticated, isAdmin, getPaymentSettings);
router.post("/admin/payment-settings", isAuthenticated, isAdmin, savePaymentSettings);

// Active Users
router.get("/admin/active-users", isAuthenticated, isAdmin, activeUsers);

// Expired Users
router.get("/admin/expired-users", isAuthenticated, isAdmin, expiredUsers);

router.get("/admin/wallet", isAuthenticated, isAdmin, require("../controllers/adminController").walletManagement);









router.get("/admin-settings",settings)

// Save settings
router.post("/save-settings",isAuthenticated,upload.single("favicon"),saveSettings)


// Reder the Notification Settings Page
router.get("/notification-settings", isAuthenticated, isAdmin,notificationSettingsPage)

// Save Notification Settings
router.post("/save-notification-settings", isAuthenticated, isAdmin,saveNotificationSettingsPage)

module.exports = router;
