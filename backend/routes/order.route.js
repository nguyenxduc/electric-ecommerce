import express from "express";
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  updateOrderStatus,
  deleteOrder,
  cancelOrder,
  getOrderStats,
} from "../controllers/order.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// User routes
router.post("/", protectRoute, createOrder);
router.get("/user/orders", protectRoute, getUserOrders);

// Admin routes (place fixed paths before dynamic :id)
router.get("/stats", protectRoute, adminRoute, getOrderStats);
router.get("/", protectRoute, adminRoute, getAllOrders);
router.patch("/:id/update_status", protectRoute, adminRoute, updateOrderStatus);
router.delete("/:id", protectRoute, adminRoute, deleteOrder);

// Shared param routes
router.get("/:id", protectRoute, getOrderById);
router.patch("/:id/cancel", protectRoute, cancelOrder);

export default router;
