const mongoose = require("mongoose");

const PrayerSchema = new mongoose.Schema({
  name: { type: String, required: true },
  time: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Prayer", PrayerSchema);