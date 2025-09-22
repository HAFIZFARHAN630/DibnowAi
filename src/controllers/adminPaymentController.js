const PaymentSettings = require("../models/paymentSettings");
const User = require("../models/user");

exports.getPaymentSettings = async (req, res) => {
  try {
    const userId = req.session.userId;
    const user = await User.findById(userId).select("first_name last_name user_img");
    const profileImagePath = user ? (user.user_img || "/img/user.jpg") : "/img/user.jpg";

    const settings = await PaymentSettings.find({}).lean();
    const gatewaySettings = {};
    settings.forEach(s => {
      gatewaySettings[s.gateway] = s;
    });
    // Defaults if not in DB
    ['stripe', 'paypal', 'bank', 'jazzcash', 'payfast'].forEach(g => {
      if (!gatewaySettings[g]) {
        gatewaySettings[g] = { gateway: g, enabled: false, mode: 'live', credentials: {} };
      }
    });

    res.render("admin/payment-settings", {
      stripeSettings: gatewaySettings.stripe,
      paypalSettings: gatewaySettings.paypal,
      bankSettings: gatewaySettings.bank,
      jazzcashSettings: gatewaySettings.jazzcash,
      payfastSettings: gatewaySettings.payfast,
      profileImagePath,
      firstName: user ? user.first_name : '',
      lastName: user ? user.last_name : '',
      success_msg: req.flash("success_msg"),
      error_msg: req.flash("error_msg")
    });
  } catch (error) {
    console.error("Error fetching payment settings:", error);
    req.flash("error_msg", "Error loading payment settings");
    res.redirect("/admin");
  }
};

exports.savePaymentSettings = async (req, res) => {
  try {
    const gateways = ['stripe', 'paypal', 'bank', 'jazzcash', 'payfast'];
    for (const gateway of gateways) {
      const existing = await PaymentSettings.findOne({ gateway });
      let enabled = existing ? existing.enabled : false;
      let mode = existing ? existing.mode : 'live';
      let credentials = existing ? existing.credentials : {};

      // Checkbox: if present and 'true', enable; else preserve
      if (req.body[`${gateway}_enabled`] === 'true') {
        enabled = true;
      } else if (req.body[`${gateway}_enabled`] === undefined) {
        // Preserve
      } else {
        enabled = false;
      }

      // Mode for stripe/paypal/jazzcash/payfast
      if (['stripe', 'paypal', 'jazzcash', 'payfast'].includes(gateway)) {
        if (req.body[`${gateway}_mode`]) {
          mode = req.body[`${gateway}_mode`];
        }
      }

      // Credentials: merge non-empty
      const credFields = gateway === 'stripe' ? ['publishable_key', 'secret_key'] :
                        gateway === 'paypal' ? ['client_id', 'client_secret'] :
                        gateway === 'jazzcash' ? ['merchant_id', 'password'] :
                        gateway === 'payfast' ? ['merchant_key', 'merchant_secret'] :
                        []; // bank no creds
      credFields.forEach(field => {
        if (req.body[`${gateway}_${field}`]) {
          credentials[field] = req.body[`${gateway}_${field}`];
        }
      });

      // Bank instructions
      if (gateway === 'bank' && req.body.bank_instructions) {
        credentials.instructions = req.body.bank_instructions;
      }

      await PaymentSettings.updateOne(
        { gateway },
        { $set: { enabled, mode, credentials } },
        { upsert: true }
      );
    }

    req.flash("success_msg", "Payment settings updated successfully!");
    res.redirect("/admin/payment-settings");
  } catch (error) {
    console.error("Error saving payment settings:", error);
    req.flash("error_msg", "Error saving settings");
    res.redirect("/admin/payment-settings");
  }
};