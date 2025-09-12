const express = require("express");
const router = express.Router();
const {
  Sell,
  SelectSell,
  DeleteProduct,
  UpdateProduct,
} = require("../controllers/sellingController");

router.get("/sell", SelectSell);

router.post("/sell/:id", Sell);

router.post("/sells/delete/:id", DeleteProduct);

router.post("/sells/update/:id", UpdateProduct);

module.exports = router;
