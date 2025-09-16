const Notification = require("../models/notification");

// Middleware to add notification data for admin users
exports.addNotificationData = async (req, res, next) => {
  try {
    // Only add notification data for admin users
    if (res.locals.isAdmin) {
      const notifications = await Notification.find().sort({ timestamp: -1 }).limit(10);
      const unreadCount = await Notification.countDocuments({ isRead: false });
      
      res.locals.notifications = notifications;
      res.locals.unreadCount = unreadCount;
    } else {
      res.locals.notifications = [];
      res.locals.unreadCount = 0;
    }
  } catch (error) {
    console.error("Error fetching notification data:", error);
    res.locals.notifications = [];
    res.locals.unreadCount = 0;
  }
  
  next();
};