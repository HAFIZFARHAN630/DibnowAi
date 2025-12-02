const express = require("express");
const router = express.Router();
const {
  Sell,
  SelectSell,
  DeleteProduct,
  UpdateProduct,
  getSoldItems,
} = require("../controllers/sellingController");

router.get("/sell", SelectSell);

router.post("/sell/:id", Sell);

router.post("/sells/delete/:id", DeleteProduct);

router.post("/sells/update/:id", UpdateProduct);

// API endpoint for sold items
router.get("/api/sold-items", getSoldItems);

module.exports = router;
