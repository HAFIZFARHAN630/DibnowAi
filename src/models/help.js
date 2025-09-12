const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  type: { type: String },
  massage: { type: String },
  timestamp: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Message", messageSchema);
