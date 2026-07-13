import express from "express";
import { prisma } from "../lib/db.js";
import {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
  searchProducts,
  getProductsByCategory,
  getMyShopProducts,
  uploadProductImages,
  deleteProductImage,
  addSales,
  addRating,
  getSimilarProducts,
  getImageSearchOverview,
  searchProductsByImage,
} from "../controllers/product.controller.js";
import {
  protectRoute,
  adminRoute,
  sellerRoute,
} from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";
import { requireShopOwnership } from "../lib/authz.js";
import { upload, uploadMemory } from "../middleware/upload.middleware.js";
import { compareProductsByAi } from "../controllers/productComparison.controller.js";

const router = express.Router();

// Resolves which shop owns the product being mutated (for ownership checks)
const resolveProductShop = async (req) => {
  const product = await prisma.product.findUnique({
    where: { id: BigInt(req.params.id) },
    select: { shop_id: true },
  });
  return product?.shop_id;
};

// Public routes (optionalAuth: admins/owners see non-active shops' products)
router.get("/", optionalAuth, getAllProducts);
router.get("/search", optionalAuth, searchProducts);
router.post("/compare-ai", compareProductsByAi);
router.post("/search-by-image", uploadMemory.single("image"), searchProductsByImage);
router.post("/search-by-image/overview", getImageSearchOverview);
router.get("/category/:categoryId", optionalAuth, getProductsByCategory);

// Seller dashboard list (before /:id so "shop" isn't parsed as an id)
router.get("/shop/mine", protectRoute, sellerRoute, getMyShopProducts);

router.get("/:id/similar", optionalAuth, getSimilarProducts);
router.get("/:id", optionalAuth, getProductById);

// Product CRUD - sellers manage their own shop's products; admins manage any
router.post(
  "/",
  protectRoute,
  sellerRoute,
  upload.array("images", 10),
  createProduct
);
router.patch(
  "/:id",
  protectRoute,
  sellerRoute,
  requireShopOwnership(resolveProductShop),
  upload.array("images", 10),
  updateProduct
);
router.delete(
  "/:id",
  protectRoute,
  sellerRoute,
  requireShopOwnership(resolveProductShop),
  deleteProduct
);

// Product image management - same ownership rules as product mutation
router.post(
  "/:id/images",
  protectRoute,
  sellerRoute,
  requireShopOwnership(resolveProductShop),
  upload.single("image"),
  uploadProductImages
);
router.delete(
  "/:id/images/:imageId",
  protectRoute,
  sellerRoute,
  requireShopOwnership(resolveProductShop),
  deleteProductImage
);

// Sales and rating
router.patch("/:id/add_sales", protectRoute, addSales);
router.patch("/:id/add_rating", protectRoute, addRating);

export default router;
