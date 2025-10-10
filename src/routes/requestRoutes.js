const express = require("express");
const router = express.Router();
const { allusers, deny, acceptManualPayment } = require("../controllers/requestController");

router.get("/request", allusers);

router.post("/deny-user", deny);

router.post("/admin/notify/manual-payment/:userId", acceptManualPayment);

module.exports = router;
