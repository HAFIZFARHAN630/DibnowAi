const express = require("express");
const router = express.Router();
const { isAuthenticated, isAdmin } = require("../middlewares/authMiddleware");

const {
  profile,
  updatePlan,       // ✅ the CORRECT one
  DeleteUser,
  getPayments,
  sendRespit,
  updatePlanRequest,
  deletePlanRequest,
  getPackageRequests
} = require("../controllers/adminrequestController");

// GET user request page
router.get("/request", isAuthenticated, getPayments);

// GET package request page (renders Request view)
router.get("/package-request", isAuthenticated, getPackageRequests);

// ✅ Use the correct controller for admin update form
router.post("/update-plan", isAuthenticated, isAdmin, updatePlan);

// (Optional) If you also want a separate user update route
// router.post("/user-update-plan", updatePlan);

router.delete("/request/:id", isAuthenticated, isAdmin, DeleteUser);
router.get("/payments", isAuthenticated, getPayments);
router.post("/send-respit", isAuthenticated, isAdmin, sendRespit);

// Plan Request Management Routes
router.post("/update-plan-request", isAuthenticated, isAdmin, updatePlanRequest);
router.delete("/plan-request/:id", isAuthenticated, isAdmin, deletePlanRequest);

module.exports = router;
