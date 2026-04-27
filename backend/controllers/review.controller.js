import { prisma } from "../lib/db.js";

export const createReview = async (req, res) => {
  try {
    const { productId, rating, comment } = req.body;
    const userId = req.user.id;

    const existingReview = await prisma.review.findFirst({
      where: { user_id: BigInt(userId), product_id: BigInt(productId) },
    });
    if (existingReview) {
      return res
        .status(400)
        .json({ message: "You have already reviewed this product" });
    }

    const product = await prisma.product.findUnique({
      where: { id: BigInt(productId) },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (rating < 1 || rating > 5) {
      return res
        .status(400)
        .json({ message: "Rating must be between 1 and 5" });
    }

    const savedReview = await prisma.review.create({
      data: {
        user_id: BigInt(userId),
        product_id: BigInt(productId),
        rating,
        comment,
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create review", error: error.message });
  }
};

export const getReviewsByProduct = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const pid = BigInt(req.params.productId);
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);
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
        total_pages: Math.ceil(total / Number(limit)),
      },
      summary: { average_rating: agg._avg.rating || 0, total_reviews: total },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get reviews", error: error.message });
  }
};

export const getReviewsByUser = async (req, res) => {
  try {
    const userId = req.user.id;

    const reviews = await prisma.review.findMany({
      where: { user_id: BigInt(userId) },
      orderBy: { created_at: "desc" },
      include: { product: { select: { id: true, name: true, img: true } } },
    });

    res.json(reviews);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get user reviews", error: error.message });
  }
};

export const updateReview = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update review", error: error.message });
  }
};

export const deleteReview = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete review", error: error.message });
  }
};

export const getReviewById = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get review", error: error.message });
  }
};

export const getAllReviews = async (req, res) => {
  try {
    const reviews = await prisma.review.findMany({
      orderBy: { created_at: "desc" },
      include: {
        user: { select: { id: true, name: true, email: true } },
        product: { select: { id: true, name: true } },
      },
    });

    res.json(reviews);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get all reviews", error: error.message });
  }
};

export const getProductReviewStats = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get review stats", error: error.message });
  }
};
