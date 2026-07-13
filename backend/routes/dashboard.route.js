import express from "express";
import {
  getDashboardStats,
  getTopProducts,
  getShopDashboardStats,
  getShopTopProducts,
} from "../controllers/dashboard.controller.js";
import {
  protectRoute,
  adminRoute,
  sellerRoute,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Platform admin
router.get("/stats", protectRoute, adminRoute, getDashboardStats);
router.get("/top-products", protectRoute, adminRoute, getTopProducts);

// Seller dashboard (scoped to own shop)
router.get("/shop/stats", protectRoute, sellerRoute, getShopDashboardStats);
router.get("/shop/top-products", protectRoute, sellerRoute, getShopTopProducts);

export default router;
