const express = require("express");
const router = express.Router();
const { checkLimit } = require("../middlewares/checkLimitMiddleware");
const Brand = require("../models/brand");

const {
  getbrand,
  addbrand,
  deletebrand,
  update,
} = require("../controllers/Brand_Controller");

// get brand
router.get("/Brand", getbrand);

// insert brand
router.post("/Brand", checkLimit("brand", Brand), addbrand);

// delete brand
router.post("/Brand/delete/:id", deletebrand);

// update brand
router.post("/Brand/update/:id", update);

module.exports = router;
