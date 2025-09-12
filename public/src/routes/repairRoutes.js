const express = require("express");
const router = express.Router();
const upload = require("../middlewares/uploadMiddleware");
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
  done,
} = require("../controllers/repairController");

// Add product
router.post("/repair", upload.single("deviceImage"), addProduct);

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
router.post("/update-status", done);

module.exports = router;
