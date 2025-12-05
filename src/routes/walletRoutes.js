const express = require("express");
const router = express.Router();
const { checkPermission } = require("../middlewares/permissionMiddleware");
const {
  getWallet,
  getHistory,
  getTopup,
  postTopup,
  topupSuccess,
  getSavedCards,
  addSavedCard,
  deleteSavedCard,
  topupWithSavedCard
} = require("../controllers/walletController");

// GET /wallet - render wallet page
router.get("/wallet", checkPermission('wallet'), getWallet);

// GET /wallet/history - render transaction history
router.get("/wallet/history", checkPermission('wallet'), getHistory);

// GET /wallet/topup - render top-up form
router.get("/wallet/topup", checkPermission('wallet'), getTopup);

// POST /wallet/topup - process top-up
router.post("/wallet/topup", postTopup);

// GET /wallet/topup-success - handle top-up success
router.get("/wallet/topup-success", topupSuccess);

// GET /wallet/saved-cards - render saved cards
router.get("/wallet/saved-cards", getSavedCards);

// POST /wallet/saved-cards - add new saved card
router.post("/wallet/saved-cards", addSavedCard);

// DELETE /wallet/saved-cards/:id - delete saved card
router.delete("/wallet/saved-cards/:id", deleteSavedCard);

// POST /wallet/topup-saved - top-up with saved payment method
router.post("/wallet/topup-saved", topupWithSavedCard);

module.exports = router;