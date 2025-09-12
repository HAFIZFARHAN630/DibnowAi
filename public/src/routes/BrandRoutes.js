const express = require("express");
const router = express.Router();

const {
  getbrand,
  addbrand,
  deletebrand,
  update,
} = require("../controllers/Brand_Controller");

// get brand
router.get("/Brand", getbrand);

// insert brand
router.post("/Brand", addbrand);

// delete brand
router.post("/Brand/delete/:id", deletebrand);

// update brand
router.post("/Brand/update/:id", update);

module.exports = router;
