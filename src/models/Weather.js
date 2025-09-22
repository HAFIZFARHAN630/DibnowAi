const mongoose = require("mongoose");

const WeatherSchema = new mongoose.Schema({
  city: { type: String, required: true },
  temperature: { type: Number, required: true },
  condition: { type: String, required: true }
}, { timestamps: true });

module.exports = mongoose.model("Weather", WeatherSchema);