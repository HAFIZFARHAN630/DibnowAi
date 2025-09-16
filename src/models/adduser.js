const mongoose = require("mongoose");

const addUserSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String },
  email: { type: String },
  address: { type: String },
  phone: { type: String },
  department: { type: String },
  role: { type: String }
});

module.exports = mongoose.model("AddUser", addUserSchema);
