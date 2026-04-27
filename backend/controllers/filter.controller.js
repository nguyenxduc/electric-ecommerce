import { prisma } from "../lib/db.js";

export const getFilterMetadata = async (req, res) => {
  try {
    const { category_id } = req.query;

    // Get filter keys and their predefined options ONLY from FilterOption table
    const filterKeys = await prisma.filterKey.findMany({
      where: { is_active: true },
      include: {
        filter_options: {
          where: {
            is_active: true,
            ...(category_id
              ? {
                  OR: [
                    { category_id: null }, // Global filters
                    { category_id: BigInt(category_id) }, // Category-specific filters
                  ],
                }
              : {
                  category_id: null, // Only global filters when no category specified
                }),
          },
          orderBy: [
            { order: "asc" },
            { display_value: "asc" },
            { value: "asc" },
          ],
        },
      },
      orderBy: { order: "asc" },
    });

    // Build result ONLY from predefined filter options (no ProductFilterValue metadata)
    const result = [];

    filterKeys.forEach((filterKey) => {
      if (filterKey.filter_options.length > 0) {
        const filterData = {
          key: filterKey.key,
          label: filterKey.label || filterKey.key.replace(/_/g, " "),
          options: filterKey.filter_options.map(
            (opt) => opt.display_value || opt.value
          ),
        };
        result.push(filterData);
      }
    });

    res.json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error("❌ Filter metadata error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get filter metadata",
      message: error.message,
    });
  }
};

// Helper function to sync filter options from products (can be called manually or via admin endpoint)
export const syncFilterOptionsFromProducts = async (req, res) => {
  try {
    const { category_id } = req.query;

    const where = {};
    if (category_id) {
      where.category_id = BigInt(category_id);
    }

    // Get all products (or filtered by category)
    const products = await prisma.product.findMany({
      where,
      select: {
        specs: true,
        specs_detail: true,
        category_id: true,
      },
    });

    // Map to store filter options by key
    const filterMap = new Map();

    // Helper function to process individual spec items
    function processSpec(spec, categoryId, filterMap) {
      const label = (spec.label || "").toLowerCase();
      const value = String(spec.value || "").trim();

      if (!value) return;

      let key = "";
      let displayLabel = "";

      if (label.includes("brand") && !label.includes("gpu")) {
        key = "brand";
        displayLabel = "Brand";
      } else if (label.includes("ram")) {
        key = "ram";
        displayLabel = "RAM";
      } else if (label.includes("screen") || label.includes("display")) {
        key = "screen_size";
        displayLabel = "Screen Size";
      } else if (label.includes("processor") || label.includes("cpu")) {
        key = "processor";
        displayLabel = "Processor";
      } else if (label.includes("chip")) {
        key = "chip";
        displayLabel = "Chip";
      } else if (label.includes("gpu") || label.includes("graphics")) {
        key = "gpu_brand";
        displayLabel = "GPU Brand";
      } else if (
        label.includes("drive") ||
        label.includes("storage") ||
        label.includes("ssd")
      ) {
        key = "drive_size";
        displayLabel = "Drive Size";
      } else if (label.includes("camera")) {
        key = "camera";
        displayLabel = "Camera";
      } else if (label.includes("battery")) {
        key = "battery";
        displayLabel = "Battery";
      } else if (label.includes("os") || label.includes("operating")) {
        key = "operating_system";
        displayLabel = "Operating System";
      }

      if (key) {
        const mapKey = `${key}_${value}_${categoryId || "null"}`;
        if (!filterMap.has(mapKey)) {
          filterMap.set(mapKey, {
            key,
            label: displayLabel,
            value,
            category_id: categoryId ? BigInt(categoryId) : null,
          });
        }
      }
    }

    // Extract unique values from specs and specs_detail
    products.forEach((product) => {
      const specs = Array.isArray(product.specs) ? product.specs : [];
      const specsDetail = Array.isArray(product.specs_detail)
        ? product.specs_detail
        : [];

      // Process specs (flat structure)
      specs.forEach((spec) => {
        if (!spec || typeof spec !== "object") return;
        processSpec(spec, product.category_id, filterMap);
      });

      // Process specs_detail (nested structure with categories and items)
      specsDetail.forEach((category) => {
        if (!category || typeof category !== "object") return;

        // Process items within each category
        const items = Array.isArray(category.items) ? category.items : [];
        items.forEach((item) => {
          if (!item || typeof item !== "object") return;
          processSpec(item, product.category_id, filterMap);
        });
      });
    });

    // Insert or update filter keys and options
    let keysCreated = 0;
    let optionsCreated = 0;
    let optionsUpdated = 0;

    for (const option of filterMap.values()) {
      // Ensure filter key exists
      let filterKey = await prisma.filterKey.findUnique({
        where: { key: option.key },
      });

      if (!filterKey) {
        filterKey = await prisma.filterKey.create({
          data: {
            key: option.key,
            label: option.label,
            data_type: "string",
            is_active: true,
          },
        });
        keysCreated++;
      }

      // Check if filter option already exists
      const existing = await prisma.filterOption.findFirst({
        where: {
          filter_key_id: filterKey.id,
          value: option.value,
          category_id: option.category_id,
        },
      });

      if (existing) {
        // Update existing
        await prisma.filterOption.update({
          where: { id: existing.id },
          data: {
            is_active: true,
          },
        });
        optionsUpdated++;
      } else {
        // Create new
        await prisma.filterOption.create({
          data: {
            filter_key_id: filterKey.id,
            value: option.value,
            category_id: option.category_id,
            is_active: true,
          },
        });
        optionsCreated++;
      }
    }

    res.json({
      success: true,
      message: `Synced filter options: ${keysCreated} keys created, ${optionsCreated} options created, ${optionsUpdated} options updated`,
      data: {
        keysCreated,
        optionsCreated,
        optionsUpdated,
        total: filterMap.size,
      },
    });
  } catch (error) {
    console.error("Sync filter options error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to sync filter options",
      message: error.message,
    });
  }
};

// Admin CRUD operations
export const listFilterOptions = async (req, res) => {
  try {
    const { category_id, key, is_active, page = 1, limit = 20, q } = req.query;

    const where = {};
    if (category_id) {
      where.category_id = BigInt(category_id);
    }
    if (key) {
      where.filter_key = { key: String(key) };
    }
    if (is_active !== undefined) {
      where.is_active = is_active === "true";
    }
    if (q) {
      where.OR = [
        { value: { contains: String(q), mode: "insensitive" } },
        { filter_key: { key: { contains: String(q), mode: "insensitive" } } },
        { filter_key: { label: { contains: String(q), mode: "insensitive" } } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [filterOptions, total] = await Promise.all([
      prisma.filterOption.findMany({
        where,
        orderBy: [
          { filter_key: { key: "asc" } },
          { order: "asc" },
          { value: "asc" },
        ],
        skip,
        take,
        include: {
          filter_key: {
            select: {
              id: true,
              key: true,
              label: true,
              data_type: true,
            },
          },
          category: {
            select: {
              id: true,
              name: true,
            },
          },
        },
      }),
      prisma.filterOption.count({ where }),
    ]);

    res.json({
      success: true,
      data: filterOptions.map((opt) => ({
        ...opt,
        id: opt.id.toString(),
        filter_key_id: opt.filter_key_id.toString(),
        category_id: opt.category_id ? opt.category_id.toString() : null,
        value: opt.value,
        display_value: opt.display_value,
        query_value: opt.query_value,
        filter_key: opt.filter_key
          ? {
              id: opt.filter_key.id.toString(),
              key: opt.filter_key.key,
              label: opt.filter_key.label,
              data_type: opt.filter_key.data_type,
            }
          : null,
        category: opt.category
          ? {
              id: opt.category.id.toString(),
              name: opt.category.name,
            }
          : null,
      })),
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total_count: total,
        total_pages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    });
  } catch (error) {
    console.error("List filter options error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list filter options",
      message: error.message,
    });
  }
};

export const getFilterOption = async (req, res) => {
  try {
    const filterOption = await prisma.filterOption.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        filter_key: {
          select: {
            id: true,
            key: true,
            label: true,
            data_type: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    if (!filterOption) {
      return res.status(404).json({
        success: false,
        error: "Filter option not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...filterOption,
        id: filterOption.id.toString(),
        filter_key_id: filterOption.filter_key_id.toString(),
        category_id: filterOption.category_id
          ? filterOption.category_id.toString()
          : null,
        value: filterOption.value,
        display_value: filterOption.display_value,
        query_value: filterOption.query_value,
        filter_key: filterOption.filter_key,
        category: filterOption.category
          ? {
              id: filterOption.category.id.toString(),
              name: filterOption.category.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Get filter option error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get filter option",
      message: error.message,
    });
  }
};

export const createFilterOption = async (req, res) => {
  try {
    const {
      filter_key_id,
      value,
      display_value,
      query_value,
      category_id,
      order,
      is_active,
    } = req.body;

    if (!filter_key_id || !value) {
      return res.status(400).json({
        success: false,
        error: "filter_key_id and value are required",
      });
    }

    // Verify filter key exists
    const filterKey = await prisma.filterKey.findUnique({
      where: { id: BigInt(filter_key_id) },
    });

    if (!filterKey) {
      return res.status(400).json({
        success: false,
        error: "Filter key not found",
      });
    }

    const filterOption = await prisma.filterOption.create({
      data: {
        filter_key_id: BigInt(filter_key_id),
        value: String(value),
        display_value: display_value ? String(display_value) : null,
        query_value: query_value ? String(query_value) : null,
        category_id: category_id ? BigInt(category_id) : null,
        order: order ? Number(order) : 0,
        is_active: is_active !== undefined ? Boolean(is_active) : true,
      },
      include: {
        filter_key: {
          select: {
            id: true,
            key: true,
            label: true,
            data_type: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...filterOption,
        id: filterOption.id.toString(),
        filter_key_id: filterOption.filter_key_id.toString(),
        category_id: filterOption.category_id
          ? filterOption.category_id.toString()
          : null,
        value: filterOption.value,
        display_value: filterOption.display_value,
        query_value: filterOption.query_value,
        filter_key: filterOption.filter_key
          ? {
              id: filterOption.filter_key.id.toString(),
              key: filterOption.filter_key.key,
              label: filterOption.filter_key.label,
              data_type: filterOption.filter_key.data_type,
            }
          : null,
        category: filterOption.category
          ? {
              id: filterOption.category.id.toString(),
              name: filterOption.category.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Create filter option error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "Filter option already exists",
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: "Failed to create filter option",
      message: error.message,
    });
  }
};

export const updateFilterOption = async (req, res) => {
  try {
    const {
      filter_key_id,
      value,
      display_value,
      query_value,
      category_id,
      order,
      is_active,
    } = req.body;

    const updateData = {};

    if (filter_key_id !== undefined) {
      // Verify filter key exists
      const filterKey = await prisma.filterKey.findUnique({
        where: { id: BigInt(filter_key_id) },
      });

      if (!filterKey) {
        return res.status(400).json({
          success: false,
          error: "Filter key not found",
        });
      }

      updateData.filter_key_id = BigInt(filter_key_id);
    }

    if (value !== undefined) updateData.value = String(value);
    if (display_value !== undefined)
      updateData.display_value = display_value ? String(display_value) : null;
    if (query_value !== undefined)
      updateData.query_value = query_value ? String(query_value) : null;
    if (category_id !== undefined) {
      updateData.category_id = category_id ? BigInt(category_id) : null;
    }
    if (order !== undefined) updateData.order = Number(order);
    if (is_active !== undefined) updateData.is_active = Boolean(is_active);

    const filterOption = await prisma.filterOption.update({
      where: { id: BigInt(req.params.id) },
      data: updateData,
      include: {
        filter_key: {
          select: {
            id: true,
            key: true,
            label: true,
            data_type: true,
          },
        },
        category: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    res.json({
      success: true,
      data: {
        ...filterOption,
        id: filterOption.id.toString(),
        filter_key_id: filterOption.filter_key_id.toString(),
        category_id: filterOption.category_id
          ? filterOption.category_id.toString()
          : null,
        value: filterOption.value,
        display_value: filterOption.display_value,
        query_value: filterOption.query_value,
        filter_key: filterOption.filter_key
          ? {
              id: filterOption.filter_key.id.toString(),
              key: filterOption.filter_key.key,
              label: filterOption.filter_key.label,
              data_type: filterOption.filter_key.data_type,
            }
          : null,
        category: filterOption.category
          ? {
              id: filterOption.category.id.toString(),
              name: filterOption.category.name,
            }
          : null,
      },
    });
  } catch (error) {
    console.error("Update filter option error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Filter option not found",
      });
    }
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "Filter option already exists",
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: "Failed to update filter option",
      message: error.message,
    });
  }
};

export const deleteFilterOption = async (req, res) => {
  try {
    await prisma.filterOption.delete({
      where: { id: BigInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Filter option deleted",
    });
  } catch (error) {
    console.error("Delete filter option error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Filter option not found",
      });
    }
    res.status(500).json({
      success: false,
      error: "Failed to delete filter option",
      message: error.message,
    });
  }
};

// FilterKey CRUD operations
export const listFilterKeys = async (req, res) => {
  try {
    const { is_active, page = 1, limit = 20, q } = req.query;

    const where = {};
    if (is_active !== undefined) {
      where.is_active = is_active === "true";
    }
    if (q) {
      where.OR = [
        { key: { contains: String(q), mode: "insensitive" } },
        { label: { contains: String(q), mode: "insensitive" } },
      ];
    }

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [filterKeys, total] = await Promise.all([
      prisma.filterKey.findMany({
        where,
        orderBy: [{ order: "asc" }, { key: "asc" }],
        include: {
          _count: {
            select: { filter_options: true },
          },
        },
        skip,
        take,
      }),
      prisma.filterKey.count({ where }),
    ]);

    res.json({
      success: true,
      data: filterKeys.map((key) => ({
        ...key,
        id: key.id.toString(),
        options_count: key._count.filter_options,
      })),
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total_count: total,
        total_pages: Math.max(1, Math.ceil(total / Number(limit))),
      },
    });
  } catch (error) {
    console.error("List filter keys error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to list filter keys",
      message: error.message,
    });
  }
};

export const getFilterKey = async (req, res) => {
  try {
    const filterKey = await prisma.filterKey.findUnique({
      where: { id: BigInt(req.params.id) },
      include: {
        filter_options: {
          include: {
            category: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
      },
    });

    if (!filterKey) {
      return res.status(404).json({
        success: false,
        error: "Filter key not found",
      });
    }

    res.json({
      success: true,
      data: {
        ...filterKey,
        id: filterKey.id.toString(),
        filter_options: filterKey.filter_options.map((opt) => ({
          ...opt,
          id: opt.id.toString(),
          filter_key_id: opt.filter_key_id.toString(),
          category_id: opt.category_id ? opt.category_id.toString() : null,
          category: opt.category
            ? {
                id: opt.category.id.toString(),
                name: opt.category.name,
              }
            : null,
        })),
      },
    });
  } catch (error) {
    console.error("Get filter key error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to get filter key",
      message: error.message,
    });
  }
};

export const createFilterKey = async (req, res) => {
  try {
    const { key, label, description, data_type, is_active, order } = req.body;

    if (!key || !label) {
      return res.status(400).json({
        success: false,
        error: "key and label are required",
      });
    }

    const filterKey = await prisma.filterKey.create({
      data: {
        key: String(key),
        label: String(label),
        description: description ? String(description) : null,
        data_type: data_type || "string",
        is_active: is_active !== undefined ? Boolean(is_active) : true,
        order: order ? Number(order) : 0,
      },
    });

    res.status(201).json({
      success: true,
      data: {
        ...filterKey,
        id: filterKey.id.toString(),
      },
    });
  } catch (error) {
    console.error("Create filter key error:", error);
    if (error.code === "P2002") {
      return res.status(409).json({
        success: false,
        error: "Filter key already exists",
        message: error.message,
      });
    }
    res.status(500).json({
      success: false,
      error: "Failed to create filter key",
      message: error.message,
    });
  }
};

export const updateFilterKey = async (req, res) => {
  try {
    const { label, description, data_type, is_active, order } = req.body;

    const filterKey = await prisma.filterKey.update({
      where: { id: BigInt(req.params.id) },
      data: {
        label: label ? String(label) : undefined,
        description:
          description !== undefined
            ? description
              ? String(description)
              : null
            : undefined,
        data_type: data_type || undefined,
        is_active: is_active !== undefined ? Boolean(is_active) : undefined,
        order: order !== undefined ? Number(order) : undefined,
      },
    });

    res.json({
      success: true,
      data: {
        ...filterKey,
        id: filterKey.id.toString(),
      },
    });
  } catch (error) {
    console.error("Update filter key error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Filter key not found",
      });
    }
    res.status(500).json({
      success: false,
      error: "Failed to update filter key",
      message: error.message,
    });
  }
};

export const deleteFilterKey = async (req, res) => {
  try {
    // Check if filter key has associated options
    const optionsCount = await prisma.filterOption.count({
      where: { filter_key_id: BigInt(req.params.id) },
    });

    if (optionsCount > 0) {
      return res.status(400).json({
        success: false,
        error: "Cannot delete filter key with associated options",
        message: `This filter key has ${optionsCount} associated options. Delete them first.`,
      });
    }

    await prisma.filterKey.delete({
      where: { id: BigInt(req.params.id) },
    });

    res.json({
      success: true,
      message: "Filter key deleted",
    });
  } catch (error) {
    console.error("Delete filter key error:", error);
    if (error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: "Filter key not found",
      });
    }
    res.status(500).json({
      success: false,
      error: "Failed to delete filter key",
      message: error.message,
    });
  }
};
