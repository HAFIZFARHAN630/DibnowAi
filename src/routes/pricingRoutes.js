const express = require("express");
const router = express.Router();
const {
  allUsers,
  addSubscription,
  paymentCancel,
  paymentSuccess,
  freeTrial,
  insertTransfer,
  getPlanPrices,
  payfastWebhook,
} = require("../controllers/pricingController");

const payfastController = require("../controllers/payfastController");
const payfastHppController = require("../controllers/payfastHppController");

const { getEnabledGateways } = require("../controllers/paymentPublicController");

router.get("/pricing", allUsers);
router.post("/pricing", addSubscription);
router.get("/success", paymentSuccess);
router.get("/cancel", paymentCancel);
router.post("/pricing/free-trial", freeTrial);
router.get("/plan-prices", getPlanPrices);

router.get("/transfer", (req, res) => {
  if (!req.session.pendingPayment) {
    return res.redirect("/pricing");
  }
  res.render("transfer", {
    plan: req.session.pendingPayment.plan,
    amount: req.session.pendingPayment.amount,
    error_msg: req.flash("error_msg"),
    success_msg: req.flash("success_msg"),
    info_msg: req.flash("info_msg")
  });
});
router.post("/transfer", insertTransfer);
router.post("/manual-payment", insertTransfer);

router.get("/api/payment-gateways", getEnabledGateways);

// PayFast HPP (Hosted Payment Page) routes
router.post("/payfast/initiate", payfastHppController.initiatePayment); // Initiate PayFast HPP payment
router.post("/payfast/ipn", payfastHppController.handleIPN); // PayFast IPN for payment notifications
router.get("/payfast/success", payfastHppController.handleSuccess); // PayFast success return URL
router.get("/payfast/cancel", payfastHppController.handleCancel); // PayFast cancel return URL

// Legacy PayFast routes (keeping for backward compatibility)
router.post("/payfast/initiate-legacy", payfastController.initiatePayment); // Legacy PayFast payment
router.post("/payfast-webhook", payfastController.handleWebhook); // Legacy PayFast webhook
router.get("/payfast/success-legacy", payfastController.handlePaymentResult); // Legacy PayFast success
router.get("/payfast/failure-legacy", payfastController.handlePaymentResult); // Legacy PayFast failure


module.exports = router;
