const mongoose = require("mongoose");

const complaintSchema = new mongoose.Schema({
  username: { type: String },
  number: { type: String },
  department: { type: String },
  Complaint: { type: String },
  Address: { type: String },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  status: { type: String, default: 'pending' },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("UserComplaint", complaintSchema);