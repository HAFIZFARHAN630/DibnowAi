const mongoose = require("mongoose");

const contactusSchema = new mongoose.Schema({
  rating: { type: Number },
  feedback_text: { type: String },
  first_name: { type: String },
  last_name: { type: String },
  email: { type: String },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Contactus", contactusSchema);