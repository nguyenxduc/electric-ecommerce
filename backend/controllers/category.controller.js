import { prisma } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
import { parsePagination } from "../lib/pagination.js";
import { asyncHandler } from "../middleware/error.middleware.js";

// Public API - returns simple array for client-side use
export const listCategories = asyncHandler(async (req, res) => {
  const categories = await prisma.category.findMany({
    where: { deleted_at: null },
    orderBy: { name: "asc" },
    include: { sub_categories: { where: { deleted_at: null } } },
  });
  res.json(categories);
});

// Admin API - returns paginated response for admin interface
export const listCategoriesAdmin = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, q } = req.query;

  const where = { deleted_at: null };
  if (q) {
    where.name = { contains: String(q), mode: "insensitive" };
  }

  const { skip, take } = parsePagination(page, limit);

  const [categories, total] = await Promise.all([
    prisma.category.findMany({
      where,
      orderBy: { name: "asc" },
      include: { sub_categories: { where: { deleted_at: null } } },
      skip,
      take,
    }),
    prisma.category.count({ where }),
  ]);

  res.json({
    categories,
    pagination: {
      current_page: Number(page),
      per_page: Number(limit),
      total_count: total,
      total_pages: Math.max(1, Math.ceil(total / Number(limit))),
    },
  });
});

export const getCategory = asyncHandler(async (req, res) => {
  const cat = await prisma.category.findUnique({
    where: { id: BigInt(req.params.id), deleted_at: null },
    include: {
      sub_categories: { where: { deleted_at: null } },
      products: { where: { deleted_at: null } },
    },
  });
  if (!cat) return res.status(404).json({ message: "Category not found" });
  res.json(cat);
});

export const getCategoryBySlug = asyncHandler(async (req, res) => {
  const cat = await prisma.category.findFirst({
    where: {
      slug: req.params.slug,
      deleted_at: null,
    },
    include: {
      sub_categories: { where: { deleted_at: null } },
      products: { where: { deleted_at: null } },
    },
  });
  if (!cat) return res.status(404).json({ message: "Category not found" });
  res.json(cat);
});

export const getSubCategoriesOfCategory = asyncHandler(async (req, res) => {
  const subs = await prisma.subCategory.findMany({
    where: { category_id: BigInt(req.params.id), deleted_at: null },
    orderBy: { name: "asc" },
  });
  res.json(subs);
});

// Helper function to create slug
const createSlug = (name) => {
  if (!name) return null;

  return name
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "") // Remove special characters
    .replace(/[\s_-]+/g, "-") // Replace spaces and underscores with hyphens
    .replace(/^-+|-+$/g, ""); // Remove leading/trailing hyphens
};

// Helper function to ensure unique slug
const ensureUniqueSlug = async (baseSlug, excludeId = null) => {
  if (!baseSlug) return null;

  let slug = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await prisma.category.findFirst({
      where: {
        slug: slug,
        ...(excludeId && { id: { not: BigInt(excludeId) } }),
      },
    });

    if (!existing) break;

    slug = `${baseSlug}-${counter}`;
    counter++;
  }

  return slug;
};

export const createCategory = asyncHandler(async (req, res) => {
  const { category } = req.body;
  const data = category || req.body;

  let imageUrl = data.image_url ?? null;
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "categories",
    });
    imageUrl = result.secure_url;
  }

  // Generate slug from name
  const baseSlug = createSlug(data.name);
  const slug = await ensureUniqueSlug(baseSlug);

  const created = await prisma.category.create({
    data: {
      name: data.name,
      slug: slug,
      image_url: imageUrl,
      description: data.description ?? null,
    },
  });
  res.status(201).json(created);
});

export const updateCategory = asyncHandler(async (req, res) => {
  const { category } = req.body;
  const data = category || req.body;

  let imageUrl;
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "categories",
    });
    imageUrl = result.secure_url;
  }

  // Generate new slug if name is being updated
  let slug;
  if (data.name) {
    const baseSlug = createSlug(data.name);
    slug = await ensureUniqueSlug(baseSlug, req.params.id);
  }

  const updated = await prisma.category.update({
    where: { id: BigInt(req.params.id) },
    data: {
      name: data.name ?? undefined,
      slug: slug ?? undefined,
      image_url: imageUrl ?? data.image_url ?? undefined,
      description: data.description ?? undefined,
    },
  });
  res.json(updated);
});

export const deleteCategory = asyncHandler(async (req, res) => {
  await prisma.category.update({
    where: { id: BigInt(req.params.id) },
    data: { deleted_at: new Date() },
  });
  res.json({ message: "Category deleted" });
});
