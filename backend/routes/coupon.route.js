import express from "express";
import {
  protectRoute,
  adminRoute,
  sellerRoute,
} from "../middleware/auth.middleware.js";
import {
  validateCoupon,
  validateMyCoupon,
  getMyCoupons,
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
  getShopCoupons,
  getMyShopCoupons,
  createShopCoupon,
  deleteShopCoupon,
} from "../controllers/coupon.controller.js";

const router = express.Router();

// Public routes
router.post("/validate", validateCoupon);
router.post("/validate-my", protectRoute, validateMyCoupon);
router.get("/my", protectRoute, getMyCoupons);

// Seller shop vouchers (fixed paths before /shop/:slug)
router.get("/shop/mine/list", protectRoute, sellerRoute, getMyShopCoupons);
router.post("/shop", protectRoute, sellerRoute, createShopCoupon);
router.delete("/shop/:id", protectRoute, sellerRoute, deleteShopCoupon);

// Public: a shop's collectible vouchers
router.get("/shop/:slug", getShopCoupons);

// Admin routes
router.get("/", protectRoute, adminRoute, getAllCoupons);
router.post("/", protectRoute, adminRoute, createCoupon);
router.get("/admin/:id", protectRoute, adminRoute, getCouponById);
router.put("/admin/:id", protectRoute, adminRoute, updateCoupon);
router.delete("/admin/:id", protectRoute, adminRoute, deleteCoupon);

export default router;
