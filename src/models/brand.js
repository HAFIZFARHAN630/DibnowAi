const mongoose = require("mongoose");

const brandSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String },
  description: { type: String }
});

module.exports = mongoose.model("Brand", brandSchema);
