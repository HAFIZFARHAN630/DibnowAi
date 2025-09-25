const mongoose = require("mongoose");

const planRequestSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  planName: {
    type: String,
    required: true,
    default: 'Free Trial'
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Pending', 'Paid', 'Cancelled'],
    default: 'Active'
  },
  startDate: {
    type: Date,
    default: Date.now
  },
  expiryDate: {
    type: Date,
    required: true
  },
  invoiceStatus: {
    type: String,
    enum: ['Paid', 'Unpaid'],
    default: 'Unpaid'
  },
  amount: {
    type: Number,
    default: 0
  },
  description: {
    type: String,
    default: 'Free Trial Plan - 7 days access'
  }
}, {
  timestamps: true
});

// Index for efficient queries
planRequestSchema.index({ user: 1, status: 1 });
planRequestSchema.index({ expiryDate: 1 });

module.exports = mongoose.model("PlanRequest", planRequestSchema);