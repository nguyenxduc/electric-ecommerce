import { prisma } from "../lib/db.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const getUserWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const items = await prisma.wishlist.findMany({
    where: { user_id: BigInt(userId), product: { deleted_at: null } },
    include: { product: true },
    orderBy: { created_at: "desc" },
  });

  res.json({
    items: items.map((i) => ({ id: i.id, product: i.product, created_at: i.created_at })),
    totalItems: items.length,
  });
});

export const addToWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.body;
  const userId = req.user.id;

  const product = await prisma.product.findFirst({
    where: { id: BigInt(productId), deleted_at: null },
  });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // upsert via unique (user_id, product_id)
  const exists = await prisma.wishlist.findUnique({
    where: { user_id_product_id: { user_id: BigInt(userId), product_id: BigInt(productId) } },
  });
  if (exists) return res.status(400).json({ message: "Product already in wishlist" });

  await prisma.wishlist.create({
    data: { user_id: BigInt(userId), product_id: BigInt(productId) },
  });

  const items = await prisma.wishlist.findMany({
    where: { user_id: BigInt(userId), product: { deleted_at: null } },
    include: { product: true },
    orderBy: { created_at: "desc" },
  });

  res.status(201).json({ message: "Product added to wishlist", items });
});

export const removeFromWishlist = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const userId = req.user.id;

  const deleted = await prisma.wishlist.delete({
    where: { user_id_product_id: { user_id: BigInt(userId), product_id: BigInt(productId) } },
  }).catch(() => null);
  if (!deleted) return res.status(404).json({ message: "Product not found in wishlist" });

  res.json({ message: "Product removed from wishlist" });
});

export const clearWishlist = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  await prisma.wishlist.deleteMany({ where: { user_id: BigInt(userId) } });
  res.json({ message: "Wishlist cleared successfully" });
});
