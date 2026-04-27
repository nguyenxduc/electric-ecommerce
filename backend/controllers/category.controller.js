import { prisma } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";

// Public API - returns simple array for client-side use
export const listCategories = async (req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { deleted_at: null },
      orderBy: { name: "asc" },
      include: { sub_categories: { where: { deleted_at: null } } },
    });
    res.json(categories);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to list categories", error: error.message });
  }
};

// Admin API - returns paginated response for admin interface
export const listCategoriesAdmin = async (req, res) => {
  try {
    const { page = 1, limit = 20, q } = req.query;

    const where = { deleted_at: null };
    if (q) {
      where.name = { contains: String(q), mode: "insensitive" };
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to list categories", error: error.message });
  }
};

export const getCategory = async (req, res) => {
  try {
    const cat = await prisma.category.findUnique({
      where: { id: BigInt(req.params.id), deleted_at: null },
      include: {
        sub_categories: { where: { deleted_at: null } },
        products: { where: { deleted_at: null } },
      },
    });
    if (!cat) return res.status(404).json({ message: "Category not found" });
    res.json(cat);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get category", error: error.message });
  }
};

export const getCategoryBySlug = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get category", error: error.message });
  }
};

export const getSubCategoriesOfCategory = async (req, res) => {
  try {
    const subs = await prisma.subCategory.findMany({
      where: { category_id: BigInt(req.params.id), deleted_at: null },
      orderBy: { name: "asc" },
    });
    res.json(subs);
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to list sub categories", error: error.message });
  }
};

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

export const createCategory = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to create category", error: error.message });
  }
};

export const updateCategory = async (req, res) => {
  try {
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
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update category", error: error.message });
  }
};

export const deleteCategory = async (req, res) => {
  try {
    await prisma.category.update({
      where: { id: BigInt(req.params.id) },
      data: { deleted_at: new Date() },
    });
    res.json({ message: "Category deleted" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete category", error: error.message });
  }
};
