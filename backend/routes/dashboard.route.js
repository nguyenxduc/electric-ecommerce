import express from "express";
import {
  getDashboardStats,
  getTopProducts,
  getShopDashboardStats,
  getShopTopProducts,
  getBehaviorAnalytics,
  getShopTodoCounts,
  getShopFinance,
  getAdminTodoCounts,
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
router.get("/behavior", protectRoute, adminRoute, getBehaviorAnalytics);
router.get("/todo", protectRoute, adminRoute, getAdminTodoCounts);

// Seller dashboard (scoped to own shop)
router.get("/shop/stats", protectRoute, sellerRoute, getShopDashboardStats);
router.get("/shop/top-products", protectRoute, sellerRoute, getShopTopProducts);
router.get("/shop/todo", protectRoute, sellerRoute, getShopTodoCounts);
router.get("/shop/finance", protectRoute, sellerRoute, getShopFinance);

export default router;
