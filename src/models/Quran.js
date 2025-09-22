const mongoose = require("mongoose");

const QuranSchema = new mongoose.Schema({
  surah: { type: String, required: true },
  ayah: { type: String, required: true },
  translation: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Quran", QuranSchema);