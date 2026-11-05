import { prisma } from "../lib/db.js";
import { ORDER_STATUS } from "../constants/status.js";
import { moderateReviewComment } from "../ai/reviewModeration.js";
import { parsePagination } from "../lib/pagination.js";
import { asyncHandler } from "../middleware/error.middleware.js";

const validateCommentByAi = async (comment) => {
  const text = String(comment || "").trim();
  if (!text) return { ok: true, moderation: null };

  const moderation = await moderateReviewComment(text);
  if (moderation?.allowed === false) {
    return {
      ok: false,
      moderation,
      message:
        moderation.reason ||
        "Bình luận không phù hợp. Vui lòng chỉnh sửa và gửi lại.",
    };
  }

  return { ok: true, moderation };
};

export const createReview = asyncHandler(async (req, res) => {
  const { productId, rating, comment } = req.body;
  const userId = req.user.id;

  const product = await prisma.product.findUnique({
    where: { id: BigInt(productId) },
  });
  if (!product) {
    return res.status(404).json({ message: "Product not found" });
  }

  // Only buyers who actually received the product may review it
  const purchased = await prisma.orderItem.findFirst({
    where: {
      product_id: BigInt(productId),
      order: {
        user_id: BigInt(userId),
        status: ORDER_STATUS.DELIVERED,
        deleted_at: null,
      },
    },
    select: { id: true },
  });
  if (!purchased) {
    return res.status(403).json({
      message: "You can only review products from your delivered orders",
    });
  }

  const existingReview = await prisma.review.findFirst({
    where: { user_id: BigInt(userId), product_id: BigInt(productId) },
  });
  if (existingReview) {
    return res
      .status(400)
      .json({ message: "You have already reviewed this product" });
  }

  if (rating < 1 || rating > 5) {
    return res
      .status(400)
      .json({ message: "Rating must be between 1 and 5" });
  }

  const moderationCheck = await validateCommentByAi(comment);
  if (!moderationCheck.ok) {
    return res.status(400).json({
      message: moderationCheck.message,
      moderation: moderationCheck.moderation,
    });
  }

  const savedReview = await prisma.review.create({
    data: {
      user_id: BigInt(userId),
      product_id: BigInt(productId),
      rating,
      comment,
      client_ip: req.ip || null,
      device_id: String(req.headers["x-device-id"] || "").slice(0, 100) || null,
    },
  });

  const agg = await prisma.review.aggregate({
    where: { product_id: BigInt(productId) },
    _avg: { rating: true },
    _count: { _all: true },
  });

  await prisma.product.update({
    where: { id: BigInt(productId) },
    data: { rating: agg._avg.rating ?? 0 },
  });

  res.status(201).json({
    message: "Review created successfully",
    review: savedReview,
  });
});

export const getReviewsByProduct = asyncHandler(async (req, res) => {
  const { page = 1, limit = 10 } = req.query;
  const pid = BigInt(req.params.productId);
  const { skip, take } = parsePagination(page, limit);
  const [total, reviews, agg] = await Promise.all([
    prisma.review.count({ where: { product_id: pid } }),
    prisma.review.findMany({
      where: { product_id: pid },
      orderBy: { created_at: "desc" },
      include: { user: { select: { id: true, name: true } } },
      skip,
      take,
    }),
    prisma.review.aggregate({
      where: { product_id: pid },
      _avg: { rating: true },
    }),
  ]);

  res.json({
    reviews,
    pagination: {
      current_page: Number(page),
      per_page: Number(limit),
      total_count: total,
      total_pages: Math.ceil(total / take),
    },
    summary: { average_rating: agg._avg.rating || 0, total_reviews: total },
  });
});

export const getReviewsByUser = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const reviews = await prisma.review.findMany({
    where: { user_id: BigInt(userId) },
    orderBy: { created_at: "desc" },
    include: { product: { select: { id: true, name: true, img: true } } },
  });

  res.json(reviews);
});

export const updateReview = asyncHandler(async (req, res) => {
  const { rating, comment } = req.body;
  const userId = req.user.id;

  const review = await prisma.review.findUnique({
    where: { id: BigInt(req.params.id) },
  });
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  if (review.user_id.toString() !== userId && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Not authorized to update this review" });
  }

  if (rating && (rating < 1 || rating > 5)) {
    return res
      .status(400)
      .json({ message: "Rating must be between 1 and 5" });
  }

  if (comment !== undefined) {
    const moderationCheck = await validateCommentByAi(comment);
    if (!moderationCheck.ok) {
      return res.status(400).json({
        message: moderationCheck.message,
        moderation: moderationCheck.moderation,
      });
    }
  }

  const updatedReview = await prisma.review.update({
    where: { id: BigInt(req.params.id) },
    data: { rating: rating ?? undefined, comment: comment ?? undefined },
  });

  const agg = await prisma.review.aggregate({
    where: { product_id: review.product_id },
    _avg: { rating: true },
  });
  await prisma.product.update({
    where: { id: review.product_id },
    data: { rating: agg._avg.rating ?? 0 },
  });

  res.json({
    message: "Review updated successfully",
    review: updatedReview,
  });
});

export const deleteReview = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const review = await prisma.review.findUnique({
    where: { id: BigInt(req.params.id) },
  });
  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  if (review.user_id.toString() !== userId && req.user.role !== "admin") {
    return res
      .status(403)
      .json({ message: "Not authorized to delete this review" });
  }

  await prisma.review.delete({ where: { id: BigInt(req.params.id) } });

  const agg = await prisma.review.aggregate({
    where: { product_id: review.product_id },
    _avg: { rating: true },
    _count: { _all: true },
  });
  await prisma.product.update({
    where: { id: review.product_id },
    data: { rating: agg._avg.rating ?? 0 },
  });

  res.json({ message: "Review deleted successfully" });
});

export const getReviewById = asyncHandler(async (req, res) => {
  const review = await prisma.review.findUnique({
    where: { id: BigInt(req.params.id) },
    include: {
      user: { select: { id: true, name: true } },
      product: { select: { id: true, name: true, img: true } },
    },
  });

  if (!review) {
    return res.status(404).json({ message: "Review not found" });
  }

  res.json(review);
});

export const getAllReviews = asyncHandler(async (req, res) => {
  const reviews = await prisma.review.findMany({
    orderBy: { created_at: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true } },
      product: { select: { id: true, name: true } },
    },
  });

  res.json(reviews);
});

export const getProductReviewStats = asyncHandler(async (req, res) => {
  const { productId } = req.params;
  const pid = BigInt(productId);

  const [agg, recentReviews] = await Promise.all([
    prisma.review.aggregate({
      where: { product_id: pid },
      _avg: { rating: true },
      _count: { rating: true },
    }),
    prisma.review.findMany({
      where: { product_id: pid },
      orderBy: { created_at: "desc" },
      take: 5,
      include: { user: { select: { id: true, name: true } } },
    }),
  ]);

  // rating distribution (1-5)
  const distribution = {};
  const all = await prisma.review.findMany({
    where: { product_id: pid },
    select: { rating: true },
  });
  for (const r of all)
    distribution[r.rating] = (distribution[r.rating] || 0) + 1;
  const ratingDistribution = Object.keys(distribution)
    .map((k) => ({ rating: Number(k), count: distribution[k] }))
    .sort((a, b) => b.rating - a.rating);

  res.json({
    totalReviews: agg._count.rating || 0,
    averageRating: agg._avg.rating || 0,
    ratingDistribution,
    recentReviews,
  });
});
