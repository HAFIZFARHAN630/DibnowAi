const express = require("express");
const router = express.Router();
const {
  admin,
  addAdmin,
  selectAddAdmin,
  deleteUser,
  updateUser,
  addUser,
  activeUsers,
  expiredUsers
} = require("../controllers/adminController");

const { getPaymentSettings, savePaymentSettings } = require("../controllers/adminPaymentController");
const { isAuthenticated, isAdmin } = require("../middlewares/authMiddleware");

// Admin page
router.get("/admin", isAuthenticated, isAdmin, admin);

// updte user
router.post("/admin/update/:id", isAuthenticated, isAdmin, updateUser);

// Delete a user
router.post("/admin/delete/:id", isAuthenticated, isAdmin, deleteUser);

// Add Admin page
router.get("/addadmin", isAuthenticated, isAdmin, (req, res, next) => {
  console.log("GET /addadmin route hit");
  selectAddAdmin(req, res, next);
});

// Add Admin action
router.post("/addadmin", isAuthenticated, isAdmin, addAdmin);

// Add User route
router.post("/admin/addUser", isAuthenticated, isAdmin, addUser);

// Payment Settings
router.get("/payment-settings", isAuthenticated, isAdmin, (req, res) => res.redirect('/admin/payment-settings'));
router.get("/admin/payment-settings", isAuthenticated, isAdmin, getPaymentSettings);
router.post("/admin/payment-settings", isAuthenticated, isAdmin, savePaymentSettings);

// Active Users
router.get("/admin/active-users", isAuthenticated, isAdmin, activeUsers);

// Expired Users
router.get("/admin/expired-users", isAuthenticated, isAdmin, expiredUsers);

router.get("/admin/wallet", isAuthenticated, isAdmin, require("../controllers/adminController").walletManagement);

module.exports = router;
