import { prisma } from "../lib/db.js";
import { ORDER_STATUS } from "../constants/status.js";
import { moderateReviewComment } from "../ai/reviewModeration.js";
import { parsePagination, buildPaginationMeta } from "../lib/pagination.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import cloudinary from "../lib/cloudinary.js";
import { notifyUser } from "../lib/notify.js";
import { createSlug } from "../lib/slug.js";

const MAX_REVIEW_IMAGES = 5;
const MAX_REPLY_LENGTH = 1000;

// multer da loc dinh dang/kich thuoc; o day chi day len Cloudinary
const uploadReviewImages = (files = []) =>
  Promise.all(
    files.map((f) =>
      cloudinary.uploader
        .upload(f.path, { folder: "reviews" })
        .then((r) => r.secure_url)
    )
  );

// Body multipart gui so duoi dang chuoi; "" / thieu = khong gui
const toRating = (v) => (v === undefined || v === "" ? undefined : Number(v));
const badRating = (r) => !Number.isInteger(r) || r < 1 || r > 5;

// Loc danh sach danh gia: ?rating=1..5, ?has_images=true
const reviewFilter = (query) => {
  const rating = Number(query.rating);
  return {
    ...(Number.isInteger(rating) && rating >= 1 && rating <= 5 && { rating }),
    ...(query.has_images === "true" && { images: { isEmpty: false } }),
  };
};

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
  const { productId, comment } = req.body;
  const rating = toRating(req.body.rating);
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

  if (badRating(rating)) {
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

  const images = await uploadReviewImages(req.files);

  const savedReview = await prisma.review.create({
    data: {
      user_id: BigInt(userId),
      product_id: BigInt(productId),
      rating,
      comment,
      images,
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
  const where = { product_id: pid, ...reviewFilter(req.query) };
  const [total, reviews, agg, allCount] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: { user: { select: { id: true, name: true } } },
      skip,
      take,
    }),
    prisma.review.aggregate({
      where: { product_id: pid },
      _avg: { rating: true },
    }),
    prisma.review.count({ where: { product_id: pid } }),
  ]);

  res.json({
    reviews,
    pagination: {
      current_page: Number(page),
      per_page: Number(limit),
      total_count: total,
      total_pages: Math.ceil(total / take),
    },
    summary: { average_rating: agg._avg.rating || 0, total_reviews: allCount },
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
  const { comment } = req.body;
  const rating = toRating(req.body.rating);
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

  if (rating !== undefined && badRating(rating)) {
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

  // keep_images: anh cu muon giu (mang, hoac chuoi JSON khi gui multipart);
  // khong gui = giu het. Chi nhan URL von thuoc review nay.
  let keep = review.images;
  if (req.body.keep_images !== undefined) {
    let raw = req.body.keep_images;
    if (typeof raw === "string") {
      try {
        raw = JSON.parse(raw);
      } catch {
        raw = [raw];
      }
    }
    keep = review.images.filter((u) => [].concat(raw).includes(u));
  }
  const files = req.files || [];
  if (keep.length + files.length > MAX_REVIEW_IMAGES) {
    return res
      .status(400)
      .json({ message: `At most ${MAX_REVIEW_IMAGES} images per review` });
  }
  const images = [...keep, ...(await uploadReviewImages(files))];

  const updatedReview = await prisma.review.update({
    where: { id: BigInt(req.params.id) },
    data: { rating: rating ?? undefined, comment: comment ?? undefined, images },
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

  const [agg, recentReviews, withImages] = await Promise.all([
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
    prisma.review.count({
      where: { product_id: pid, images: { isEmpty: false } },
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
    withImages,
    recentReviews,
  });
});

// GET /api/reviews/shop/mine?filter=unreplied&rating=5 - danh gia san pham cua shop minh
export const getShopReviews = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20 } = req.query;
  const { skip, take, currentPage, perPage } = parsePagination(page, limit);
  // Admin khong co req.shop: shop_id undefined = khong loc theo shop
  const where = {
    product: { shop_id: req.shop?.id },
    ...reviewFilter(req.query),
    ...(req.query.filter === "unreplied" && { seller_reply: null }),
  };
  const [total, reviews] = await Promise.all([
    prisma.review.count({ where }),
    prisma.review.findMany({
      where,
      orderBy: { created_at: "desc" },
      include: {
        user: { select: { id: true, name: true } },
        product: { select: { id: true, name: true, img: true } },
      },
      skip,
      take,
    }),
  ]);
  res.json({ reviews, pagination: buildPaginationMeta(currentPage, perPage, total) });
});

// Review thuoc san pham cua shop dang dang nhap; khong thi null (404, khong lo su ton tai)
const findOwnShopReview = (req) =>
  req.shop
    ? prisma.review.findFirst({
        where: { id: BigInt(req.params.id), product: { shop_id: req.shop.id } },
        include: { product: { select: { id: true, name: true } } },
      })
    : null;

// PUT /api/reviews/:id/reply { reply } - seller tra loi cong khai (sua duoc)
export const replyReview = asyncHandler(async (req, res) => {
  const reply = String(req.body?.reply ?? "").trim();
  if (!reply || reply.length > MAX_REPLY_LENGTH) {
    return res
      .status(400)
      .json({ message: `Reply must be 1-${MAX_REPLY_LENGTH} characters` });
  }
  const review = await findOwnShopReview(req);
  if (!review) return res.status(404).json({ message: "Review not found" });

  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { seller_reply: reply, seller_reply_at: new Date() },
  });
  // Chi bao lan tra loi dau; sua lai khong bao nua
  if (!review.seller_reply) {
    notifyUser({
      userId: review.user_id,
      title: "The seller replied to your review",
      message: `${req.shop.name} replied to your review of ${review.product.name}`,
      type: "SYSTEM",
      // Cung dang slug "<ten>-p<id>" voi frontend (makeProductSlug)
      link: `/product/${createSlug(review.product.name) || "product"}-p${review.product.id}#reviews`,
    });
  }
  res.json({ message: "Reply saved", review: updated });
});

// DELETE /api/reviews/:id/reply
export const deleteReviewReply = asyncHandler(async (req, res) => {
  const review = await findOwnShopReview(req);
  if (!review) return res.status(404).json({ message: "Review not found" });
  const updated = await prisma.review.update({
    where: { id: review.id },
    data: { seller_reply: null, seller_reply_at: null },
  });
  res.json({ message: "Reply removed", review: updated });
});
