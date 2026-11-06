import { prisma } from "../lib/db.js";
import { asyncHandler } from "../middleware/error.middleware.js";

// Get all settings (admin only)
export const getAllSettings = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const where = { deleted_at: null };
  if (category) {
    where.category = category;
  }

  const settings = await prisma.setting.findMany({
    where,
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  res.json({ settings });
});

// Get public settings (no auth required)
export const getPublicSettings = asyncHandler(async (req, res) => {
  const { category } = req.query;
  const where = { deleted_at: null, is_public: true };
  if (category) {
    where.category = category;
  }

  const settings = await prisma.setting.findMany({
    where,
    orderBy: [{ category: "asc" }, { key: "asc" }],
  });

  // Convert to key-value object for easier access
  const settingsMap = {};
  settings.forEach((setting) => {
    let value = setting.value;
    // Parse based on data type
    if (setting.data_type === "number") {
      value = Number(value);
    } else if (setting.data_type === "boolean") {
      value = value === "true";
    } else if (setting.data_type === "json") {
      try {
        value = JSON.parse(value);
      } catch {
        value = setting.value;
      }
    }
    settingsMap[setting.key] = value;
  });

  res.json({ settings: settingsMap });
});

// Get single setting by key
export const getSettingByKey = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const setting = await prisma.setting.findFirst({
    where: {
      key,
      deleted_at: null,
    },
  });

  if (!setting) {
    return res.status(404).json({ message: "Setting not found" });
  }

  // Parse value based on data type
  let value = setting.value;
  if (setting.data_type === "number") {
    value = Number(value);
  } else if (setting.data_type === "boolean") {
    value = value === "true";
  } else if (setting.data_type === "json") {
    try {
      value = JSON.parse(value);
    } catch {
      value = setting.value;
    }
  }

  res.json({ ...setting, parsedValue: value });
});

// Create or update setting (admin only)
export const upsertSetting = asyncHandler(async (req, res) => {
  const { key, value, description, category, data_type, is_public } =
    req.body;

  if (!key || value === undefined) {
    return res.status(400).json({
      message: "Key and value are required",
    });
  }

  // Validate data type
  const validDataTypes = ["string", "number", "boolean", "json"];
  const type = data_type || "string";
  if (!validDataTypes.includes(type)) {
    return res.status(400).json({
      message: `Invalid data_type. Must be one of: ${validDataTypes.join(
        ", "
      )}`,
    });
  }

  // Convert value to string for storage
  let stringValue = String(value);
  if (type === "json" && typeof value === "object") {
    stringValue = JSON.stringify(value);
  }

  const setting = await prisma.setting.upsert({
    where: { key },
    update: {
      value: stringValue,
      // `|| undefined` made clearing a description to "" a silent no-op
      // (Prisma treats undefined as "leave unchanged") - only omit the
      // field when it wasn't sent at all.
      description: description !== undefined ? description || null : undefined,
      category: category || "general",
      data_type: type,
      is_public: is_public !== undefined ? is_public : false,
      updated_at: new Date(),
    },
    create: {
      key,
      value: stringValue,
      description: description || null,
      category: category || "general",
      data_type: type,
      is_public: is_public !== undefined ? is_public : false,
    },
  });

  res.json({
    message: "Setting saved successfully",
    setting,
  });
});

// Update setting (admin only)
export const updateSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;
  const { value, description, category, data_type, is_public } = req.body;

  const existing = await prisma.setting.findFirst({
    where: { key, deleted_at: null },
  });

  if (!existing) {
    return res.status(404).json({ message: "Setting not found" });
  }

  // Convert value to string for storage
  let stringValue = existing.value;
  if (value !== undefined) {
    const type = data_type || existing.data_type;
    if (type === "json" && typeof value === "object") {
      stringValue = JSON.stringify(value);
    } else {
      stringValue = String(value);
    }
  }

  const setting = await prisma.setting.update({
    where: { id: existing.id },
    data: {
      value: stringValue,
      description:
        description !== undefined ? description : existing.description,
      category: category || existing.category,
      data_type: data_type || existing.data_type,
      is_public: is_public !== undefined ? is_public : existing.is_public,
      updated_at: new Date(),
    },
  });

  res.json({
    message: "Setting updated successfully",
    setting,
  });
});

// Delete setting (admin only - soft delete)
export const deleteSetting = asyncHandler(async (req, res) => {
  const { key } = req.params;

  const setting = await prisma.setting.findFirst({
    where: { key, deleted_at: null },
  });

  if (!setting) {
    return res.status(404).json({ message: "Setting not found" });
  }

  await prisma.setting.update({
    where: { id: setting.id },
    data: { deleted_at: new Date() },
  });

  res.json({ message: "Setting deleted successfully" });
});
