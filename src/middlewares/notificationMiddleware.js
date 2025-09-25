const Notification = require("../models/notification");

// Middleware to add notification data for admin users and user notifications for regular users
exports.addNotificationData = async (req, res, next) => {
  try {
    // Add notification data for admin users (existing functionality)
    if (res.locals.isAdmin) {
      const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
      const unreadCount = await Notification.countDocuments({ isRead: false });

      res.locals.notifications = notifications;
      res.locals.unreadCount = unreadCount;
    } else {
      res.locals.notifications = [];
      res.locals.unreadCount = 0;
    }

    // Add user-specific notifications for regular users
    if (res.locals.isUser && req.session.userId) {
      const userNotifications = await Notification.find({ userId: req.session.userId })
        .sort({ timestamp: -1 })
        .limit(10);

      const userUnreadCount = await Notification.countDocuments({
        userId: req.session.userId,
        isRead: false
      });

      res.locals.userNotifications = userNotifications;
      res.locals.userUnreadCount = userUnreadCount;
    } else {
      res.locals.userNotifications = [];
      res.locals.userUnreadCount = 0;
    }
  } catch (error) {
    console.error("Error fetching notification data:", error);
    res.locals.notifications = [];
    res.locals.unreadCount = 0;
    res.locals.userNotifications = [];
    res.locals.userUnreadCount = 0;
  }

  next();
};