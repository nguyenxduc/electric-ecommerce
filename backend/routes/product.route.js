import express from "express";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  uploadProductImages,
  deleteProductImage,
  addSales,
  addRating,
  getSimilarProducts,
} from "../controllers/product.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getAllProducts);
router.get("/search", searchProducts);
router.get("/category/:categoryId", getProductsByCategory);
router.get("/:id/similar", getSimilarProducts);
router.get("/:id", getProductById);

// Protected routes - require authentication
router.post(
  "/:id/images",
  protectRoute,
  upload.single("image"),
  uploadProductImages
);
router.delete("/:id/images/:imageId", protectRoute, deleteProductImage);

// Admin CRUD
router.post(
  "/",
  protectRoute,
  adminRoute,
  upload.array("images", 10),
  createProduct
);
router.patch(
  "/:id",
  protectRoute,
  adminRoute,
  upload.array("images", 10),
  updateProduct
);
router.delete("/:id", protectRoute, adminRoute, deleteProduct);

// Sales and rating
router.patch("/:id/add_sales", protectRoute, addSales);
router.patch("/:id/add_rating", protectRoute, addRating);

export default router;
