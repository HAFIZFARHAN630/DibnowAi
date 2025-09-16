const express = require("express");
const router = express.Router();
const { getNotifications, markAsRead } = require("../controllers/notificationController");
const { isAuthenticated, isAdmin } = require("../middlewares/authMiddleware");

router.get("/api/notifications", isAuthenticated, isAdmin, getNotifications);
router.post("/api/notifications/mark-read", isAuthenticated, isAdmin, markAsRead);
router.delete("/api/notifications/:id", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const Notification = require("../models/notification");
    await Notification.findByIdAndDelete(req.params.id);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notification" });
  }
});
router.post("/api/notifications/delete-multiple", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const { ids } = req.body;
    const Notification = require("../models/notification");
    await Notification.deleteMany({ _id: { $in: ids } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: "Failed to delete notifications" });
  }
});

// Test route
router.get("/api/test-notification", isAuthenticated, isAdmin, async (req, res) => {
  try {
    const User = require("../models/user");
    const user = await User.findById(req.session.userId).select('first_name');
    if (user && req.app.locals.notificationService) {
      await req.app.locals.notificationService.createNotification(
        req.session.userId,
        user.first_name,
        "Login"
      );
      res.json({ success: true, message: "Test notification created" });
    } else {
      res.json({ success: false, message: "User or service not found" });
    }
  } catch (error) {
    res.json({ success: false, error: error.message });
  }
});

module.exports = router;