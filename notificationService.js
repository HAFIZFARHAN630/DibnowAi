const Notification = require("./src/models/notification");

class NotificationService {
  constructor(io) {
    this.io = io;
  }

  async createNotification(userId, userName, action) {
    try {
      console.log(`Creating notification: ${userName} - ${action}`);
      
      const notification = new Notification({
        userId,
        userName,
        action,
        timestamp: new Date()
      });

      await notification.save();
      console.log(`Notification saved: ${notification._id}`);

      // Emit to all admin clients
      this.io.emit("newNotification", {
        id: notification._id,
        userName,
        action,
        timestamp: notification.timestamp,
        isRead: false
      });
      console.log(`Notification emitted to clients`);

      return notification;
    } catch (error) {
      console.error("Error creating notification:", error);
    }
  }

  async getUnreadCount() {
    try {
      return await Notification.countDocuments({ isRead: false });
    } catch (error) {
      console.error("Error getting unread count:", error);
      return 0;
    }
  }

  async getRecentNotifications(limit = 10) {
    try {
      return await Notification.find()
        .sort({ timestamp: -1 })
        .limit(limit);
    } catch (error) {
      console.error("Error getting notifications:", error);
      return [];
    }
  }

  async markAsRead() {
    try {
      await Notification.updateMany({ isRead: false }, { isRead: true });
      this.io.emit("notificationsRead");
    } catch (error) {
      console.error("Error marking notifications as read:", error);
    }
  }
}

module.exports = NotificationService;