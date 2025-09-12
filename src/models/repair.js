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
  random_id: { type: String },
  Price: { type: Number }
});

module.exports = mongoose.model("Repair", repairSchema);
