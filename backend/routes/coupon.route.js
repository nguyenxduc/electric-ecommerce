import express from "express";
import {
  protectRoute,
  adminRoute,
  sellerRoute,
} from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";
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
  updateShopCoupon,
  deleteShopCoupon,
  quoteCoupons,
  getClaimableCoupons,
  claimCoupon,
  unclaimCoupon,
} from "../controllers/coupon.controller.js";

import { registerIdParams } from "../middleware/validateId.middleware.js";

const router = express.Router();
registerIdParams(router);

// Public routes
// optionalAuth: voucher ca nhan chi hop le khi biet nguoi dang xem
router.post("/validate", optionalAuth, validateCoupon);
router.post("/validate-my", protectRoute, validateMyCoupon);
router.get("/my", protectRoute, getMyCoupons);
router.post("/quote", protectRoute, quoteCoupons);
router.get("/claimable", optionalAuth, getClaimableCoupons);
router.post("/:id/claim", protectRoute, claimCoupon);
router.delete("/:id/claim", protectRoute, unclaimCoupon);

// Seller shop vouchers (fixed paths before /shop/:slug)
router.get("/shop/mine/list", protectRoute, sellerRoute, getMyShopCoupons);
router.post("/shop", protectRoute, sellerRoute, createShopCoupon);
router.put("/shop/:id", protectRoute, sellerRoute, updateShopCoupon);
router.delete("/shop/:id", protectRoute, sellerRoute, deleteShopCoupon);

// Public: a shop's collectible vouchers
router.get("/shop/:slug", optionalAuth, getShopCoupons);

// Admin routes
router.get("/", protectRoute, adminRoute, getAllCoupons);
router.post("/", protectRoute, adminRoute, createCoupon);
router.get("/admin/:id", protectRoute, adminRoute, getCouponById);
router.put("/admin/:id", protectRoute, adminRoute, updateCoupon);
router.delete("/admin/:id", protectRoute, adminRoute, deleteCoupon);

export default router;
