const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");

const {
  viewitems,
  additems,
  updateitems,
  deleteitems,
  desProducts,
} = require("../controllers/in_stockController");

// View single item details
router.get("/inStock_details/:id", desProducts);

// View and add items
router.get("/in_stock", viewitems);
router.post("/in_stock", upload.single("device_image"), additems);
router.post("/update/:id", upload.single("device_image"), updateitems);
router.post("/delete/:id", deleteitems);

module.exports = router;
