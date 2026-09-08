import express from "express";
import {
  applyForShop,
  getMyShop,
  updateMyShop,
  listShops,
  getShopBySlug,
  adminListShops,
  approveShop,
  rejectShop,
  suspendShop,
} from "../controllers/shop.controller.js";
import { getProductsByShop } from "../controllers/product.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";
import { upload } from "../middleware/upload.middleware.js";
import { registerIdParams } from "../middleware/validateId.middleware.js";

const router = express.Router();
registerIdParams(router);

const shopImages = upload.fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);

// Admin moderation (before /:slug so "admin" isn't parsed as a slug)
router.get("/admin/all", protectRoute, adminRoute, adminListShops);
router.patch("/admin/:id/approve", protectRoute, adminRoute, approveShop);
router.patch("/admin/:id/reject", protectRoute, adminRoute, rejectShop);
router.patch("/admin/:id/suspend", protectRoute, adminRoute, suspendShop);

// Seller self-service
router.post("/apply", protectRoute, shopImages, applyForShop);
router.get("/me", protectRoute, getMyShop);
router.patch("/me", protectRoute, shopImages, updateMyShop);

// Public
router.get("/", listShops);
router.get("/:slug/products", getProductsByShop);
router.get("/:slug", optionalAuth, getShopBySlug);

export default router;
