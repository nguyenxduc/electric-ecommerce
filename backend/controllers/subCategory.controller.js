import { prisma } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
import { asyncHandler } from "../middleware/error.middleware.js";

export const listSubCategories = asyncHandler(async (req, res) => {
  const where = {};
  if (req.query.category_id) where.category_id = BigInt(req.query.category_id);
  where.deleted_at = null;
  const list = await prisma.subCategory.findMany({ where, orderBy: { name: "asc" } });
  res.json(list);
});

export const getSubCategory = asyncHandler(async (req, res) => {
  const sub = await prisma.subCategory.findUnique({
    where: { id: BigInt(req.params.id), deleted_at: null },
    include: { category: true },
  });
  if (!sub) return res.status(404).json({ message: "Sub category not found" });
  res.json(sub);
});

export const createSubCategory = asyncHandler(async (req, res) => {
  const { sub_category } = req.body;
  const data = sub_category || req.body;
  let imageUrl = data.image_url ?? null;
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "sub_categories",
    });
    imageUrl = result.secure_url;
  }
  const created = await prisma.subCategory.create({
    data: {
      name: data.name,
      image_url: imageUrl,
      description: data.description ?? null,
      category_id: BigInt(data.category_id),
    },
  });
  res.status(201).json(created);
});

export const updateSubCategory = asyncHandler(async (req, res) => {
  const { sub_category } = req.body;
  const data = sub_category || req.body;
  let imageUrl;
  if (req.file) {
    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "sub_categories",
    });
    imageUrl = result.secure_url;
  }
  const updated = await prisma.subCategory.update({
    where: { id: BigInt(req.params.id) },
    data: {
      name: data.name ?? undefined,
      image_url: imageUrl ?? data.image_url ?? undefined,
      description: data.description ?? undefined,
      category_id: data.category_id ? BigInt(data.category_id) : undefined,
    },
  });
  res.json(updated);
});

export const deleteSubCategory = asyncHandler(async (req, res) => {
  await prisma.subCategory.update({
    where: { id: BigInt(req.params.id) },
    data: { deleted_at: new Date() },
  });
  res.json({ message: "Sub category deleted" });
});


