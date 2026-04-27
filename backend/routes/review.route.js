import express from "express";
import {
  createReview,
  getReviewsByProduct,
  getReviewsByUser,
  getReviewById,
  updateReview,
  deleteReview,
  getAllReviews,
  getProductReviewStats,
} from "../controllers/review.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes (legacy)
router.get("/product/:productId", getReviewsByProduct);
router.get("/product/:productId/stats", getProductReviewStats);
router.get("/:id", getReviewById);

// Protected routes
router.post("/", protectRoute, createReview);
router.get("/user/reviews", protectRoute, getReviewsByUser);
router.put("/:id", protectRoute, updateReview);
router.delete("/:id", protectRoute, deleteReview);

// Admin routes
router.get("/", protectRoute, adminRoute, getAllReviews);

export default router;
