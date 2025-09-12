const express = require("express");
const router = express.Router();
const {
  allUsers,
  addSubscription,
  paymentCancel,
  paymentSuccess,
  freeTrial,
  insertTransfer,
} = require("../controllers/pricingController");

router.get("/pricing", allUsers);
router.post("/pricing", addSubscription);
router.get("/success", paymentSuccess);
router.get("/cancel", paymentCancel);
router.post("/pricing/free-trial", freeTrial);

router.post("/transfer", insertTransfer);

module.exports = router;
