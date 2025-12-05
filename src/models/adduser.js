const mongoose = require("mongoose");

const addUserSchema = new mongoose.Schema({
  user_id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  name: { type: String, required: true, trim: true },
  email: {
    type: String,
    required: true,
    trim: true,
    lowercase: true,
    unique: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  address: { type: String, trim: true },
  phone: { type: String, trim: true },
  department: { type: String, required: true, trim: true },
  role: { type: String, required: true, trim: true },
  password: { type: String, required: true },
  status: { type: String, default: 'active', enum: ['active', 'inactive'] },
  permissions: {
    type: Object,
    default: null
  }
}, {
  timestamps: true // This adds createdAt and updatedAt fields
});

// Add index for better query performance
addUserSchema.index({ user_id: 1, email: 1 });

module.exports = mongoose.model("AddUser", addUserSchema, "addusers");
