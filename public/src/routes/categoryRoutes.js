const express = require("express");
const router = express.Router();

const {
  getcategory,
  addcategory,
  deletecategory,
  update,
} = require("../controllers/categoryController");

// get category
router.get("/category", getcategory);

// insert category
router.post("/category", addcategory);

// delete category
router.post("/category/delete/:id", deletecategory);

// update category
router.post("/category/update/:id", update);

module.exports = router;
