const mongoose = require("mongoose");

const paymentsSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  plan: {
    type: String,
    required: true
  },
  amount: {
    type: Number,
    required: true
  },
  gateway: {
    type: String,
    enum: ['stripe', 'paypal', 'bank', 'payfast', 'payfast_token', 'manual'],
    required: true
  },
  transaction_id: {
    type: String,
    required: false
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  status: {
    type: String,
    enum: ['active', 'expired', 'pending'],
    default: 'active'
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("Payments", paymentsSchema);