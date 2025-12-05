const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { checkLimit } = require("../middlewares/checkLimitMiddleware");
const { checkPermission } = require("../middlewares/permissionMiddleware");
const Inventory = require("../models/inventery");

const {
  viewitems,
  additems,
  updateitems,
  deleteitems,
  desProducts,
} = require("../controllers/in_stockController");

// View single item details
router.get("/inStock_details/:id", checkPermission('stock'), desProducts);

// View and add items
router.get("/in_stock", checkPermission('stock'), viewitems);
router.post("/in_stock", checkPermission('stock'), checkLimit("inStock", Inventory), upload.single("device_image"), additems);
router.post("/update/:id", upload.single("device_image"), updateitems);
router.post("/delete/:id", deleteitems);

module.exports = router;
