const mongoose = require("mongoose");

const infoSchema = new mongoose.Schema({
  favicon: { type: String },
  title: { type: String },
  description: { type: String },
  welcome_description: { type: String },
  navbar_color: { type: String }
});

module.exports = mongoose.model("Info", infoSchema);