const express = require("express");
const router = express.Router();
const { isAuthenticated } = require("../middlewares/authMiddleware");
const { getcategory } = require("../controllers/categoryController");

router.get("/Allcategories", isAuthenticated, getcategory);

module.exports = router;
