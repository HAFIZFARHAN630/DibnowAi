const express = require("express");
const router = express.Router();
const { profile,review } = require("../controllers/reviewController");

router.get("/review", profile);

router.post("/delete-feedback/:id", review);


module.exports = router;