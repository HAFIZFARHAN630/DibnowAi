const mongoose = require("mongoose");

const soldItemSchema = new mongoose.Schema({
  fullName: { type: String },
  Number: { type: Number },
  Price: { type: Number },
  Product: { type: String },
  Type: { type: String },
  sale_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now },
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
});

module.exports = mongoose.model("SoldItem", soldItemSchema);
