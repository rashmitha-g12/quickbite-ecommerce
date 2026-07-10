const express = require("express");
const {
  createOrder,
  getMyOrders,
  getOrderById,
  updateOrderStatus,
  markOrderPaid,
  getAllOrders,
  getOrderStats,
} = require("../controllers/orderController");
const { protect, adminOnly } = require("../middleware/authMiddleware");

const router = express.Router();

// Admin routes (must come before /:id to avoid clash)
router.get("/stats", protect, adminOnly, getOrderStats);
router.get("/", protect, adminOnly, getAllOrders);

// User routes
router.post("/", protect, createOrder);
router.get("/my", protect, getMyOrders);
router.get("/:id", protect, getOrderById);
router.put("/:id/pay", protect, markOrderPaid);

// Admin status update
router.put("/:id/status", protect, adminOnly, updateOrderStatus);

module.exports = router;
