import { prisma } from "../lib/db.js";

// Get all settings (admin only)
export const getAllSettings = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch settings",
      error: error.message,
    });
  }
};

// Get public settings (no auth required)
export const getPublicSettings = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch public settings",
      error: error.message,
    });
  }
};

// Get single setting by key
export const getSettingByKey = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to fetch setting",
      error: error.message,
    });
  }
};

// Create or update setting (admin only)
export const upsertSetting = async (req, res) => {
  try {
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
        description: description || undefined,
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to save setting",
      error: error.message,
    });
  }
};

// Update setting (admin only)
export const updateSetting = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to update setting",
      error: error.message,
    });
  }
};

// Delete setting (admin only - soft delete)
export const deleteSetting = async (req, res) => {
  try {
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
  } catch (error) {
    res.status(500).json({
      message: "Failed to delete setting",
      error: error.message,
    });
  }
};
