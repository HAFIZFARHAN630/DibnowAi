const mongoose = require("mongoose");

const inventorySchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  product_name: { type: String },
  Quantity: { type: Number },
  Brand: { type: String },
  Model: { type: String },
  Color: { type: String },
  Sale_Price: { type: Number },
  imei_number: { type: Number },
  gadget_problem: { type: String },
  device_image: { type: String },
  Category: { type: String },
  Retail_Price: { type: Number },
  status: { type: String },
  sale_date: { type: Date, default: Date.now },
  created_at: { type: Date, default: Date.now }
});

module.exports = mongoose.model("Inventory", inventorySchema);
