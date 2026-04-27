import express from "express";
import {
  listCategories,
  listCategoriesAdmin,
  getCategory,
  getCategoryBySlug,
  getSubCategoriesOfCategory,
  createCategory,
  updateCategory,
  deleteCategory,
} from "../controllers/category.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", listCategories);

// Admin routes (must come before parameterized routes)
router.get("/admin", protectRoute, adminRoute, listCategoriesAdmin);

// Slug-based routes (must come before ID-based routes)
router.get("/slug/:slug", getCategoryBySlug);

// Parameterized routes (must come after specific routes)
router.get("/:id", getCategory);
router.get("/:id/sub-categories", getSubCategoriesOfCategory);
router.post(
  "/",
  protectRoute,
  adminRoute,
  upload.single("image"),
  createCategory
);
router.patch(
  "/:id",
  protectRoute,
  adminRoute,
  upload.single("image"),
  updateCategory
);
router.delete("/:id", protectRoute, adminRoute, deleteCategory);

export default router;
