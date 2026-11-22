import express from "express";
import fs from "node:fs";
import multer from "multer";
import {
  createReview,
  getReviewsByProduct,
  getReviewsByUser,
  getReviewById,
  updateReview,
  deleteReview,
  getAllReviews,
  getProductReviewStats,
  getShopReviews,
  replyReview,
  deleteReviewReply,
} from "../controllers/review.controller.js";
import { protectRoute, adminRoute, sellerRoute } from "../middleware/auth.middleware.js";

import { registerIdParams } from "../middleware/validateId.middleware.js";

const router = express.Router();
registerIdParams(router);

// Anh danh gia: toi da 5 anh jpg/png/webp <= 2MB; loi multer tra 400 thay vi 500
const reviewImageUpload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 2 * 1024 * 1024, files: 5 },
  fileFilter: (_req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname)),
}).array("images", 5);
const reviewImages = (req, res, next) => {
  // File tam cua multer khong tu xoa: don khi ket noi dong
  res.on("close", () => {
    for (const f of req.files || []) fs.unlink(f.path, () => {});
  });
  return reviewImageUpload(req, res, (err) =>
    err
      ? res.status(400).json({
          message:
            err.code === "LIMIT_FILE_SIZE"
              ? "Each image must be 2MB or smaller"
              : err.code === "LIMIT_FILE_COUNT"
              ? "At most 5 images per review"
              : "Images must be JPG, PNG or WebP (max 5)",
        })
      : next()
  );
};

// Public routes (legacy)
router.get("/product/:productId", getReviewsByProduct);
router.get("/product/:productId/stats", getProductReviewStats);
router.get("/:id", getReviewById);

// Protected routes
router.post("/", protectRoute, reviewImages, createReview);
router.get("/user/reviews", protectRoute, getReviewsByUser);
router.put("/:id", protectRoute, reviewImages, updateReview);

// Seller: danh gia san pham cua shop minh + tra loi cong khai
router.get("/shop/mine", protectRoute, sellerRoute, getShopReviews);
router.put("/:id/reply", protectRoute, sellerRoute, replyReview);
router.delete("/:id/reply", protectRoute, sellerRoute, deleteReviewReply);
router.delete("/:id", protectRoute, deleteReview);

// Admin routes
router.get("/", protectRoute, adminRoute, getAllReviews);

export default router;
