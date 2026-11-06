// Dong bo bo loc tu du lieu san pham.
//
// Doc bang thong so ky thuat cua toan bo san pham, suy ra danh sach khoa loc
// va gia tri loc, roi ghi vao filter_keys / filter_options.
//
// Truoc day toan bo phan nay nam trong mot handler HTTP dai 179 dong. Hau qua
// thuc te: muon chay dong bo dinh ky bang job hay bang script thi phai goi
// mot endpoint qua mang, tu dung ban than minh, thay vi goi thang mot ham.

import { prisma } from "../lib/db.js";

/**
 * @param {bigint|string|null} categoryId gioi han trong mot danh muc, bo trong
 *   thi quet toan bo catalog.
 * @returns {{keysCreated:number, optionsCreated:number, optionsUpdated:number, total:number}}
 */
export const syncFilterOptions = async ({ categoryId = null } = {}) => {
  const category_id = categoryId;

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

      // Keep flat specs_detail entries compatible with the admin product form.
      if (!Array.isArray(category.items)) {
        processSpec(category, product.category_id, filterMap);
        return;
      }

      // Process items within each category
      category.items.forEach((item) => {
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

  return {
    keysCreated,
    optionsCreated,
    optionsUpdated,
    total: filterMap.size,
  };
};
