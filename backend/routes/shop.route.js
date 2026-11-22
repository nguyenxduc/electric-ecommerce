import express from "express";
import fs from "node:fs";
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
  adminUpdateShopTax,
} from "../controllers/shop.controller.js";
import { follow, unfollow, myFollowedShops } from "../controllers/shopFollow.controller.js";
import { getProductsByShop } from "../controllers/product.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";
import multer from "multer";
import { registerIdParams } from "../middleware/validateId.middleware.js";

const router = express.Router();
registerIdParams(router);

// Logo/banner: chi anh jpg/png/webp <= 2MB; loi multer tra 400 thay vi 500
const shopImageUpload = multer({
  storage: multer.diskStorage({}),
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (_req, file, cb) =>
    /^image\/(jpeg|png|webp)$/.test(file.mimetype)
      ? cb(null, true)
      : cb(new multer.MulterError("LIMIT_UNEXPECTED_FILE", file.fieldname)),
}).fields([
  { name: "logo", maxCount: 1 },
  { name: "banner", maxCount: 1 },
]);
const shopImages = (req, res, next) => {
  // File tam cua multer khong tu xoa: don khi ket noi dong (ca khi client huy giua chung)
  res.on("close", () => {
    for (const f of Object.values(req.files || {}).flat()) fs.unlink(f.path, () => {});
  });
  return shopImageUpload(req, res, (err) =>
    err
      ? res.status(400).json({
          success: false,
          error:
            err.code === "LIMIT_FILE_SIZE"
              ? "Image must be 2MB or smaller"
              : "Logo/banner must be a JPG, PNG or WebP image",
        })
      : next()
  );
};

// Admin moderation (before /:slug so "admin" isn't parsed as a slug)
router.get("/admin/all", protectRoute, adminRoute, adminListShops);
router.patch("/admin/:id/approve", protectRoute, adminRoute, approveShop);
router.patch("/admin/:id/reject", protectRoute, adminRoute, rejectShop);
router.patch("/admin/:id/suspend", protectRoute, adminRoute, suspendShop);
router.patch("/:id/tax", protectRoute, adminRoute, adminUpdateShopTax);

// Seller self-service
router.post("/apply", protectRoute, shopImages, applyForShop);
router.get("/me", protectRoute, getMyShop);
router.patch("/me", protectRoute, shopImages, updateMyShop);

// Follow (truoc /:slug de "following" khong bi coi la slug)
router.get("/following/mine", protectRoute, myFollowedShops);
router.post("/:slug/follow", protectRoute, follow);
router.delete("/:slug/follow", protectRoute, unfollow);

// Public
router.get("/", listShops);
router.get("/:slug/products", getProductsByShop);
router.get("/:slug", optionalAuth, getShopBySlug);

export default router;
