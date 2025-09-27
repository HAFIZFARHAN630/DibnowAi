const mongoose = require("mongoose");

const notificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      "Login",
      "Register",
      "Add Inventory",
      "Add Repair Customer",
      "Change Repair Status",
      "Add In-stock Item",
      "Make Sale",
      "Move to Out-stock",
      "Buy Plan",
      "Logout",
      "Add Brand",
      "Add Category",
      "Team Limit Exceeded"
    ]
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  isRead: {
    type: Boolean,
    default: false
  }
});

module.exports = mongoose.model("Notification", notificationSchema);