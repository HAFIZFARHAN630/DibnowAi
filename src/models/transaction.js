const mongoose = require("mongoose");

const transactionSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  type: {
    type: String,
    enum: ['topup', 'payment', 'plan_purchase'],
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  date: {
    type: Date,
    default: Date.now
  },
  status: {
    type: String,
    enum: ['success', 'failed', 'pending'],
    default: 'pending'
  },
  gateway: {
    type: String,
    enum: ['stripe', 'paypal', 'payfast', 'wallet', 'bank', 'manual', 'jazzcash'],
    required: false
  },
  description: {
    type: String,
    required: false
  },
  reference: {
    type: String,
    required: false
  },
  payment_intent_id: {
    type: String,
    required: false
  },
  error: {
    type: String,
    required: false
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Transaction", transactionSchema);