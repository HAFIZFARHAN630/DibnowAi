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

// PayFast OAuth2 Payment routes
router.post("/payfast/initiate", payfastController.initiatePayment);
router.post("/payfast/initiate-token", payfastController.initiatePayment);
router.post("/pricing/payfast/initiate-token", payfastController.initiatePayment);
router.get("/payfast/test", payfastController.testPayFastConnection);
router.post("/payfast/webhook", payfastController.handleWebhook);
router.get("/pricing/payfast/success", payfastController.handleSuccess);
router.get("/pricing/payfast/cancel", payfastController.handleCancel);
router.post("/pricing/payfast/ipn", payfastController.handleWebhook);




module.exports = router;
