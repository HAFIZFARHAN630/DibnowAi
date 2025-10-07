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
// Removed: const payfastHppController = require("../controllers/payfastHppController");

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

// PayFast Token-based Payment routes (NEW APPROACH)
router.post("/payfast/initiate-token", payfastController.initiateTokenPayment); // Initiate PayFast token payment
router.get("/payfast/test-connection", payfastController.testPayFastConnection); // Test PayFast API connectivity




module.exports = router;
