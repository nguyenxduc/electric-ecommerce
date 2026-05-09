import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import {
  validateCoupon,
  validateMyCoupon,
  getMyCoupons,
  createCoupon,
  getAllCoupons,
  getCouponById,
  updateCoupon,
  deleteCoupon,
} from "../controllers/coupon.controller.js";

const router = express.Router();

// Public routes
router.post("/validate", validateCoupon);
router.post("/validate-my", protectRoute, validateMyCoupon);
router.get("/my", protectRoute, getMyCoupons);

// Admin routes
router.get("/", protectRoute, adminRoute, getAllCoupons);
router.post("/", protectRoute, adminRoute, createCoupon);
router.get("/admin/:id", protectRoute, adminRoute, getCouponById);
router.put("/admin/:id", protectRoute, adminRoute, updateCoupon);
router.delete("/admin/:id", protectRoute, adminRoute, deleteCoupon);

export default router;
