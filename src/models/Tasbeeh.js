const mongoose = require("mongoose");

const TasbeehSchema = new mongoose.Schema({
  phrase: { type: String, required: true },
  count: { type: Number, default: 0 }
}, { timestamps: true });

module.exports = mongoose.model("Tasbeeh", TasbeehSchema);