const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
const { checkLimit } = require("../middlewares/checkLimitMiddleware");
const Repair = require("../models/repair");
const {
    addProduct,
    getRepairProducts,
    getClients,
    updateClients,
    updateProduct,
    deleteClients,
    deleteClient,
    deleteProduct,
    deleteProducts,
    getRepairPrices,
    getCompletedTasksCount,
    done,
    getPublicTrackingPage,
    trackRepairById,
  } = require("../controllers/repairController");

// Add product
router.post("/repair", checkLimit("repairCustomer", Repair), upload.single("deviceImage"), addProduct);

// Select product
router.get("/repair", getRepairProducts);

// Update product
router.put("/repair/:id", updateProduct);

// Select product
router.post("/repair/delete", deleteProducts);
router.post("/repair/:id", deleteProduct);

// Select clients
router.get("/Clients", getClients);

// Update Status
router.post("/Clients/update/:id", updateClients);

// Delete Client
router.post("/Clients/delete", deleteClients);
router.post("/Clients/:id", deleteClient);

// Export the router
router.get("/api/repair-prices", getRepairPrices);
router.get("/api/completed-tasks", getCompletedTasksCount);
router.post("/update-status", done);

// Public tracking routes (no authentication required)
router.get("/track", getPublicTrackingPage);
router.get("/track/:trackingId", trackRepairById);

module.exports = router;
