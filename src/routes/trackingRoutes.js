const express = require("express");
const router = express.Router();
const {trackingPage,trackProduct} = require("../controllers/trackingController");
const {isAuthenticated} = require("../middlewares/authMiddleware");
const {isAdmin} = require("../middlewares/authMiddleware");


router.get("/tracking",isAuthenticated,trackingPage)
router.post("/track-product",isAuthenticated,trackProduct)


module.exports = router;