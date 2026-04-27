import express from "express";
import {
  listSubCategories,
  getSubCategory,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
} from "../controllers/subCategory.controller.js";
import { upload } from "../middleware/upload.middleware.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", listSubCategories);
router.get("/:id", getSubCategory);
router.post(
  "/",
  protectRoute,
  adminRoute,
  upload.single("image"),
  createSubCategory
);
router.patch(
  "/:id",
  protectRoute,
  adminRoute,
  upload.single("image"),
  updateSubCategory
);
router.delete("/:id", protectRoute, adminRoute, deleteSubCategory);

export default router;
