const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  first_name: { type: String },
  last_name: { type: String },
  email: { type: String, unique: true },
  phone_number: { type: String },
  password: { type: String },
  company: { type: String },
  address: { type: String },
  postcode: { type: String },
  user_img: { type: String },
  country: { type: String },
  currency: { type: String },
  plan_name: { type: String },
  created_at: { type: Date, default: Date.now },
  role: { type: String, default: 'user' },
  subscription_date: { type: Date, default: Date.now },
  plan_limit: { type: Number },
  transfer_id: { type: String },
  amount: { type: Number },
  status: { type: String },
  denial_reason: { type: String },
  isVerified: {type:Boolean, default: false},
  otp: {type:String},
  otp_expiry:{type:Date},
  stripe_customer_id: { type: String },
  planLimits: {
    repairCustomer: { type: Number, default: 0 },
    category: { type: Number, default: 0 },
    brand: { type: Number, default: 0 },
    teams: { type: Number, default: 0 },
    inStock: { type: Number, default: 0 }
  }
});

module.exports = mongoose.model("User", userSchema);
