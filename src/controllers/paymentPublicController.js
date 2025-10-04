require("dotenv").config();
const PaymentSettings = require("../models/paymentSettings");
// Only initialize Stripe if we have a valid secret key
let stripe = null;
if (process.env.STRIPE_SECRET_KEY && process.env.STRIPE_SECRET_KEY.length >= 20) {
  stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);
  console.log("Stripe initialized in paymentPublicController with key length:", process.env.STRIPE_SECRET_KEY.length);
} else {
  console.warn("Stripe not initialized in paymentPublicController - invalid or missing secret key");
}

exports.getEnabledGateways = async (req, res) => {
  try {
    let settings = await PaymentSettings.find({ enabled: true }).lean();

    if (settings.length === 0) {
      // Fallback defaults
      const fallbacks = [];
      
      // Stripe fallback
      if (process.env.STRIPE_PUBLISHABLE_KEY) {
        fallbacks.push({
          gateway: 'stripe',
          publishable_key: process.env.STRIPE_PUBLISHABLE_KEY,
          mode: process.env.STRIPE_MODE || 'sandbox'
        });
      }
      
      // PayPal fallback
      if (process.env.PAYPAL_CLIENT_ID) {
        fallbacks.push({
          gateway: 'paypal',
          client_id: process.env.PAYPAL_CLIENT_ID,
          mode: process.env.PAYPAL_MODE || 'sandbox'
        });
      }
      
      // Bank fallback - always include if no others
      fallbacks.push({
        gateway: 'bank',
        instructions: 'Please transfer to Bank of Punjab Account: 1234567890. Reference your order ID.'
      });
      
      res.json(fallbacks);
      return;
    }

    const enabledGateways = settings.map(s => {
      const safe = { gateway: s.gateway };
      
      switch (s.gateway) {
        case 'stripe':
          safe.publishable_key = s.credentials.publishable_key;
          safe.mode = s.mode;
          break;
        case 'paypal':
          safe.client_id = s.credentials.client_id;
          safe.mode = s.mode;
          break;
        case 'bank':
          safe.instructions = s.credentials.instructions || 'Please transfer to our bank account. Details will be provided.';
          break;
        case 'jazzcash':
          safe.merchant_id = s.credentials.merchant_id;
          safe.mode = s.mode;
          break;
        case 'payfast':
          safe.merchant_key = s.credentials.merchant_key;
          safe.mode = s.mode;
          break;
      }
      
      return safe;
    });

    res.json(enabledGateways);
  } catch (error) {
    console.error("Error fetching enabled gateways:", error);
    res.status(500).json({ error: "Failed to fetch gateways" });
  }
};