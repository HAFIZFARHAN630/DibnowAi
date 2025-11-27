const mongoose = require("mongoose");

const repairSchema = new mongoose.Schema({
  fullName: { type: String },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  mobileNumber: { type: Number },
  brand: { type: String },
  email: { type: String },
  device: { type: String },
  deviceImage: { type: String },
  status: { type: String },
  gadgetProblem: { type: String },
  random_id: { type: String, unique: true },
  Price: { type: Number }
}, { timestamps: true });

// Compound index to prevent duplicate repairs for same customer
repairSchema.index({ user_id: 1, fullName: 1, mobileNumber: 1, brand: 1, device: 1 }, { unique: false });

module.exports = mongoose.model("Repair", repairSchema);
