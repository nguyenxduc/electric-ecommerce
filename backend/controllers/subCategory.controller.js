import { prisma } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";

export const listSubCategories = async (req, res) => {
  try {
    const where = {};
    if (req.query.category_id) where.category_id = BigInt(req.query.category_id);
    where.deleted_at = null;
    const list = await prisma.subCategory.findMany({ where, orderBy: { name: "asc" } });
    res.json(list);
  } catch (error) {
    res.status(500).json({ message: "Failed to list sub categories", error: error.message });
  }
};

export const getSubCategory = async (req, res) => {
  try {
    const sub = await prisma.subCategory.findUnique({
      where: { id: BigInt(req.params.id), deleted_at: null },
      include: { category: true },
    });
    if (!sub) return res.status(404).json({ message: "Sub category not found" });
    res.json(sub);
  } catch (error) {
    res.status(500).json({ message: "Failed to get sub category", error: error.message });
  }
};

export const createSubCategory = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Failed to create sub category", error: error.message });
  }
};

export const updateSubCategory = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({ message: "Failed to update sub category", error: error.message });
  }
};

export const deleteSubCategory = async (req, res) => {
  try {
    await prisma.subCategory.update({
      where: { id: BigInt(req.params.id) },
      data: { deleted_at: new Date() },
    });
    res.json({ message: "Sub category deleted" });
  } catch (error) {
    res.status(500).json({ message: "Failed to delete sub category", error: error.message });
  }
};


