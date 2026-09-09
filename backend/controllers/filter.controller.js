import { prisma } from "../lib/db.js";
import { parsePagination } from "../lib/pagination.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { syncFilterOptions } from "../services/filterSync.service.js";

export const getFilterMetadata = asyncHandler(async (req, res) => {
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
});

// Helper function to sync filter options from products (can be called manually or via admin endpoint)
export const syncFilterOptionsFromProducts = asyncHandler(async (req, res) => {
  const result = await syncFilterOptions({
    categoryId: req.query.category_id ? BigInt(req.query.category_id) : null,
  });

  res.json({
    success: true,
    message: `Synced filter options: ${result.keysCreated} keys created, ${result.optionsCreated} options created, ${result.optionsUpdated} options updated`,
    data: result,
  });
});

// Admin CRUD operations
export const listFilterOptions = asyncHandler(async (req, res) => {
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

  const { skip, take } = parsePagination(page, limit);

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
});

export const getFilterOption = asyncHandler(async (req, res) => {
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
});

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
export const listFilterKeys = asyncHandler(async (req, res) => {
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

  const { skip, take } = parsePagination(page, limit);

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
});

export const getFilterKey = asyncHandler(async (req, res) => {
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
});

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
