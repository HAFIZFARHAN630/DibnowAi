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
  plan_name: { type: String, default: 'FREE TRIAL' },
  created_at: { type: Date, default: Date.now },
  role: { type: String, default: 'user' },
  subscription_date: { type: Date, default: Date.now },
  plan_limit: { type: Number, default: 30 },
  transfer_id: { type: String },
  amount: { type: Number },
  status: { type: String },
  denial_reason: { type: String },
  isVerified: {type:Boolean, default: false},
  otp: {type:String},
  otp_expiry:{type:Date},
  stripe_customer_id: { type: String },
});

module.exports = mongoose.model("User", userSchema);
