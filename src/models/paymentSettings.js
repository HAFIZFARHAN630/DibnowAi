const mongoose = require("mongoose");

const paymentSettingsSchema = new mongoose.Schema({
  gateway: {
    type: String,
    enum: ['stripe', 'paypal', 'bank', 'jazzcash', 'payfast'],
    required: true,
    unique: true
  },
  enabled: {
    type: Boolean,
    default: false
  },
  mode: {
    type: String,
    enum: ['live', 'sandbox'],
    default: 'live'
  },
  credentials: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  }
}, {
  timestamps: true
});

module.exports = mongoose.model("PaymentSettings", paymentSettingsSchema);