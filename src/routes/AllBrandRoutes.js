const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { getbrand } = require("../controllers/Brand_Controller");

router.get("/AllBrand", isAuthenticated, getbrand);

module.exports = router;
