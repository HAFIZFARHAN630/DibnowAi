const mongoose = require("mongoose");

const categorySchema = new mongoose.Schema({
  name: { type: String },
  description: { type: String },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model("Category", categorySchema);
