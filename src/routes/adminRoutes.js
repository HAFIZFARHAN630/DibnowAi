const express = require("express");
const router = express.Router();
const {
  admin,
  addAdmin,
  selectAddAdmin,
  deleteUser,
  updateUser,
  addUser,
} = require("../controllers/adminController");
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

module.exports = router;
