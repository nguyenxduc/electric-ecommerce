import express from "express";
import { prisma } from "../lib/db.js";
import {
  createOrder,
  getOrderById,
  getUserOrders,
  getAllOrders,
  getShopOrders,
  getShopOrderStats,
  updateOrderStatus,
  deleteOrder,
  cancelOrder,
  getOrderStats,
} from "../controllers/order.controller.js";
import {
  protectRoute,
  adminRoute,
  sellerRoute,
} from "../middleware/auth.middleware.js";
import { requireShopOwnership } from "../lib/authz.js";

const router = express.Router();

// Resolves which shop owns the order being mutated (for ownership checks)
const resolveOrderShop = async (req) => {
  const order = await prisma.order.findUnique({
    where: { id: BigInt(req.params.id) },
    select: { shop_id: true },
  });
  return order?.shop_id;
};

// User routes
router.post("/", protectRoute, createOrder);
router.get("/user/orders", protectRoute, getUserOrders);

// Seller routes (place fixed paths before dynamic :id)
router.get("/shop/mine", protectRoute, sellerRoute, getShopOrders);
router.get("/shop/stats", protectRoute, sellerRoute, getShopOrderStats);

// Admin routes
router.get("/stats", protectRoute, adminRoute, getOrderStats);
router.get("/", protectRoute, adminRoute, getAllOrders);
// Sellers may update status of their own shop's orders; admins any order
router.patch(
  "/:id/update_status",
  protectRoute,
  sellerRoute,
  requireShopOwnership(resolveOrderShop),
  updateOrderStatus
);
router.delete("/:id", protectRoute, adminRoute, deleteOrder);

// Shared param routes
router.get("/:id", protectRoute, getOrderById);
router.patch("/:id/cancel", protectRoute, cancelOrder);

export default router;
