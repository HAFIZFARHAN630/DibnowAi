const Notification = require("../models/notification");

exports.getNotifications = async (req, res) => {
  try {
    const notifications = await Notification.find()
      .sort({ timestamp: -1 })
      .limit(20);
    
    const unreadCount = await Notification.countDocuments({ isRead: false });
    
    res.json({
      notifications,
      unreadCount
    });
  } catch (error) {
    console.error("Error fetching notifications:", error);
    res.status(500).json({ error: "Failed to fetch notifications" });
  }
};

exports.markAsRead = async (req, res) => {
  try {
    await Notification.updateMany({ isRead: false }, { isRead: true });

    // Emit to all connected clients
    req.app.locals.notificationService.io.emit("notificationsRead");

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking notifications as read:", error);
    res.status(500).json({ error: "Failed to mark notifications as read" });
  }
};

exports.markUserAsRead = async (req, res) => {
  try {
    if (!req.session.userId) {
      return res.status(401).json({ error: "User not authenticated" });
    }

    await Notification.updateMany(
      { userId: req.session.userId, isRead: false },
      { isRead: true }
    );

    res.json({ success: true });
  } catch (error) {
    console.error("Error marking user notifications as read:", error);
    res.status(500).json({ error: "Failed to mark user notifications as read" });
  }
};