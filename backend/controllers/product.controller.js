import { prisma } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
import {
  buildGeneralProductOverview,
  detectProductFromImage,
} from "../ai/imageSearch.js";

// Helper function to calculate final_price and discount_percentage
const calculateProductPrices = (product) => {
  const price = Number(product.price);
  const discount = Number(product.discount || 0);
  const final_price = price - discount;
  const discount_percentage =
    price > 0 ? Math.round((discount / price) * 100) : 0;

  // sum available stock from product_colors if present
  const colors = product.product_colors || [];
  const color_stock_sum = colors.reduce(
    (sum, c) => sum + Number(c.quantity || 0),
    0
  );
  const quantity =
    color_stock_sum > 0 ? color_stock_sum : Number(product.quantity || 0);

  return {
    ...product,
    price,
    discount,
    final_price,
    discount_percentage,
    rating: product.rating ? Number(product.rating) : 0,
    quantity,
    available_colors: colors.map((c) => ({
      name: c.name || "",
      code: c.code || "",
      quantity: Number(c.quantity || 0),
    })),
  };
};

const normalizeText = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const collectProductTokens = (product) => {
  const tokens = [product.name, product.description];
  if (Array.isArray(product.specs)) {
    product.specs.forEach((item) => {
      tokens.push(item?.label, item?.value);
    });
  }
  return normalizeText(tokens.filter(Boolean).join(" "));
};

const extractMeaningfulTokens = (value, minLength = 2) =>
  [...new Set(
    normalizeText(value)
      .split(/\s+/)
      .map((x) => x.trim())
      .filter((x) => x.length >= minLength)
  )];

const buildTypeHints = ({ detectedType, detectedModel, detectedSummary }) => {
  const source = normalizeText(
    [detectedType, detectedModel, detectedSummary].filter(Boolean).join(" ")
  );
  const hints = new Set(extractMeaningfulTokens(detectedType, 3));

  if (/\b(phone|smartphone|iphone|dien thoai|mobile)\b/.test(source)) {
    ["phone", "smartphone", "iphone", "mobile", "dien", "thoai"].forEach((x) =>
      hints.add(x)
    );
  }
  if (/\b(laptop|macbook|notebook|ultrabook)\b/.test(source)) {
    ["laptop", "macbook", "notebook", "ultrabook"].forEach((x) => hints.add(x));
  }
  if (/\b(headphone|earbud|earphone|airpods|tai nghe)\b/.test(source)) {
    ["headphone", "earbud", "earphone", "airpods", "tai", "nghe"].forEach((x) =>
      hints.add(x)
    );
  }
  if (/\b(tablet|ipad)\b/.test(source)) {
    ["tablet", "ipad"].forEach((x) => hints.add(x));
  }
  if (/\b(camera|may anh|dslr|mirrorless)\b/.test(source)) {
    ["camera", "anh", "dslr", "mirrorless"].forEach((x) => hints.add(x));
  }
  if (/\b(watch|smartwatch)\b/.test(source)) {
    ["watch", "smartwatch"].forEach((x) => hints.add(x));
  }

  return [...hints].filter((x) => x.length >= 3);
};

const buildSuggestedQueries = ({ detected = {}, products = [] }) => {
  const seedQueries = [
    [detected?.brand, detected?.line_or_model].filter(Boolean).join(" "),
    [detected?.brand, detected?.product_type].filter(Boolean).join(" "),
    detected?.line_or_model,
    detected?.product_type,
    ...products.slice(0, 3).map((p) => p?.name),
  ]
    .map((q) => String(q || "").trim())
    .filter(Boolean);

  return [...new Set(seedQueries)].slice(0, 5);
};

const compactText = (value) =>
  String(value || "")
    .replace(/\s+/g, " ")
    .trim();

const buildGeneralProductNotice = ({ detected = {}, product = null }) => {
  const type = compactText(detected?.product_type);
  const brand = compactText(detected?.brand);
  const model = compactText(detected?.line_or_model);
  const productName = compactText(product?.name);
  const productDescription = compactText(product?.description);

  const intro = productName
    ? `${productName} thuộc nhóm ${type || "sản phẩm điện tử"}.`
    : `${type || "Sản phẩm điện tử"} được nhận diện từ ảnh.`;
  const details = [
    brand ? `Thương hiệu: ${brand}.` : "",
    model ? `Dòng/model: ${model}.` : "",
  ]
    .filter(Boolean)
    .join(" ");
  const summary = productDescription ? productDescription.slice(0, 140) : "";

  return [intro, details, summary].filter(Boolean).join(" ").slice(0, 260);
};

export const createProduct = async (req, res) => {
  try {
    const {
      name,
      price,
      discount = 0,
      quantity = 0,
      img = [],
      specs,
      specs_detail,
      color, // legacy
      product_colors = [],
      category_id,
      sub_category_id,
      description = "",
    } = req.body;

    const parseJsonArray = (value) => {
      if (!value) return [];
      if (Array.isArray(value) || typeof value === "object") return value;
      try {
        return JSON.parse(value);
      } catch {
        return [];
      }
    };

    const parseBigIntOrUndefined = (v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const num = Number(v);
      if (Number.isNaN(num)) return undefined;
      return BigInt(num);
    };

    const parseSubCategory = (v) => {
      if (v === undefined) return undefined;
      if (v === null || v === "") return null;
      const num = Number(v);
      if (Number.isNaN(num)) return null;
      return BigInt(num);
    };

    // ✅ đảm bảo JSON đúng kiểu
    const specsJson = parseJsonArray(specs);
    const specsDetailJson = parseJsonArray(specs_detail);
    const colorJson = parseJsonArray(color);

    let imageUrls = Array.isArray(img) ? img : [];
    if (Array.isArray(req.files) && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, { folder: "products" })
        )
      );
      imageUrls = uploads.map((u) => u.secure_url);
    }

    const colorsInput =
      Array.isArray(product_colors) && product_colors.length
        ? product_colors
        : colorJson;

    const result = await prisma.$transaction(async (tx) => {
      const savedProduct = await tx.product.create({
        data: {
          name,
          price: Number(price),
          discount: Number(discount),
          quantity: Number(quantity),
          img: imageUrls,
          specs: specsJson, // ✅ JSON
          specs_detail: specsDetailJson, // ✅ JSON
          color: colorJson, // ✅ JSON
          category_id: parseBigIntOrUndefined(category_id),
          sub_category_id: parseSubCategory(sub_category_id),
          description: String(description),
        },
      });

      if (Array.isArray(colorsInput) && colorsInput.length > 0) {
        await tx.productColor.createMany({
          data: colorsInput.map((c) => ({
            product_id: savedProduct.id,
            name: c.name || "",
            code: c.code || "",
            quantity: Number(c.quantity || 0),
          })),
        });

        const sumQty = colorsInput.reduce(
          (sum, c) => sum + Number(c.quantity || 0),
          0
        );

        await tx.product.update({
          where: { id: savedProduct.id },
          data: { quantity: sumQty },
        });

        savedProduct.quantity = sumQty;
      }

      return savedProduct;
    });

    res.status(201).json({
      message: "Product created successfully",
      product: result,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create product",
      error: error.message,
    });
  }
};

export const getAllProducts = async (req, res) => {
  try {
    // Standard query parameters (not filters)
    const standardParams = [
      "search",
      "category_id",
      "sub_category_id",
      "in_stock",
      "price_min",
      "price_max",
      "discount",
      "sort",
      "page",
      "limit",
    ];

    const {
      search,
      category_id,
      sub_category_id,
      in_stock,
      price_min,
      price_max,
      discount,
      sort,
      page = 1,
      limit = 20,
    } = req.query;

    // Extract all filter parameters (everything except standard params)
    const filterParams = {};
    Object.keys(req.query).forEach((key) => {
      if (!standardParams.includes(key) && req.query[key]) {
        filterParams[key] = req.query[key];
      }
    });

    // Special handling for discount parameter
    // If discount is not "true", treat it as a dynamic filter
    if (discount && discount !== "true") {
      filterParams.discount = discount;
    }

    const where = {};
    if (search) where.name = { contains: String(search), mode: "insensitive" };
    if (category_id) where.category_id = BigInt(category_id);
    if (sub_category_id) where.sub_category_id = BigInt(sub_category_id);
    if (in_stock === "true") where.quantity = { gt: 0 };
    if (discount === "true") where.discount = { gt: 0 };
    if (price_min || price_max) {
      where.price = {};
      if (price_min) where.price.gte = Number(price_min);
      if (price_max) where.price.lte = Number(price_max);
    }

    let orderBy = { created_at: "desc" };
    if (sort === "price-asc") orderBy = { price: "asc" };
    else if (sort === "price-desc") orderBy = { price: "desc" };
    else if (sort === "rating") orderBy = { rating: "desc" };
    else if (sort === "newest") orderBy = { created_at: "desc" };
    else if (sort === "popular") orderBy = { sold: "desc" };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const allProducts = await prisma.product.findMany({
      where: { ...where, deleted_at: null },
      orderBy,
      include: { product_colors: true },
    });

    if (Object.keys(filterParams).length === 0) {
      const total = allProducts.length;
      const paginatedProducts = allProducts.slice(skip, skip + take);
      const productsWithCalculations = paginatedProducts.map(
        calculateProductPrices
      );

      return res.json({
        products: productsWithCalculations,
        pagination: {
          current_page: Number(page),
          per_page: Number(limit),
          total_count: total,
          total_pages: Math.ceil(total / Number(limit)),
        },
      });
    }

    // Get filter keys and options for building filter logic
    const filterKeys = await prisma.filterKey.findMany({
      where: { is_active: true },
      include: {
        filter_options: {
          where: { is_active: true },
          select: {
            id: true,
            value: true,
            display_value: true,
            query_value: true,
            category_id: true,
          },
        },
      },
    });

    // Build filter key mapping and query value mapping
    const filterKeyMap = new Map();
    const queryValueMap = new Map();

    filterKeys.forEach((filterKey) => {
      const key = filterKey.key.toLowerCase();
      filterKeyMap.set(key, {
        id: filterKey.id,
        key: filterKey.key,
        label: filterKey.label,
        data_type: filterKey.data_type,
      });

      // Build query value mapping from options
      filterKey.filter_options.forEach((option) => {
        const displayValue = option.display_value || option.value;
        const queryValue = option.query_value || option.value;
        if (displayValue && queryValue) {
          queryValueMap.set(displayValue.toLowerCase(), queryValue);
        }
      });
    });

    // Filter products based on ProductFilterValue table
    let filteredProductIds = new Set();
    let isFirstFilter = true;

    for (const [filterParam, filterValue] of Object.entries(filterParams)) {
      const filterKey = filterKeyMap.get(filterParam.toLowerCase());
      if (!filterKey) continue;

      let productIds = new Set();

      // Handle multiple values (comma-separated) for OR logic within same filter key
      const filterValues = Array.isArray(filterValue)
        ? filterValue
        : filterValue
            .split(",")
            .map((v) => v.trim())
            .filter((v) => v);

      // Collect all product IDs that match ANY of the values (OR logic)

      for (const singleValue of filterValues) {
        if (filterParam === "discount" && singleValue !== "true") {
          // Special handling for discount filter
          const queryValue =
            queryValueMap.get(singleValue.toLowerCase()) || singleValue;

          if (queryValue.startsWith(">=")) {
            const minDiscount = parseFloat(queryValue.substring(2));
            const discountProducts = await prisma.product.findMany({
              where: {
                discount: { gte: minDiscount },
                deleted_at: null,
              },
              select: { id: true },
            });
            discountProducts.forEach((p) => productIds.add(p.id.toString()));
          }
        } else if (filterParam === "rating") {
          // Special handling for rating filter
          const queryValue =
            queryValueMap.get(singleValue.toLowerCase()) || singleValue;

          if (queryValue.startsWith(">=")) {
            const minRating = parseFloat(queryValue.substring(2));
            const ratingProducts = await prisma.product.findMany({
              where: {
                rating: { gte: minRating },
                deleted_at: null,
              },
              select: { id: true },
            });
            ratingProducts.forEach((p) => productIds.add(p.id.toString()));
          }
        } else if (filterParam === "rating_range") {
          // Special handling for rating range filter
          const queryValue =
            queryValueMap.get(singleValue.toLowerCase()) || singleValue;

          if (queryValue.startsWith(">=")) {
            const minRating = parseFloat(queryValue.substring(2));
            const ratingProducts = await prisma.product.findMany({
              where: {
                rating: { gte: minRating },
                deleted_at: null,
              },
              select: { id: true },
            });
            ratingProducts.forEach((p) => productIds.add(p.id.toString()));
          }
        } else if (filterParam === "price_range") {
          // Special handling for price range filter
          const queryValue =
            queryValueMap.get(singleValue.toLowerCase()) || singleValue;

          let priceWhere = {};

          if (queryValue.startsWith("BETWEEN")) {
            // Handle "BETWEEN 500 AND 1000" format
            const match = queryValue.match(/BETWEEN\s+(\d+)\s+AND\s+(\d+)/i);
            if (match) {
              const minPrice = parseFloat(match[1]);
              const maxPrice = parseFloat(match[2]);
              priceWhere = {
                price: { gte: minPrice, lte: maxPrice },
              };
            }
          } else if (queryValue.startsWith("<")) {
            // Handle "<200" format
            const maxPrice = parseFloat(queryValue.substring(1));
            priceWhere = {
              price: { lt: maxPrice },
            };
          } else if (queryValue.startsWith(">")) {
            // Handle ">2000" format
            const minPrice = parseFloat(queryValue.substring(1));
            priceWhere = {
              price: { gt: minPrice },
            };
          }

          if (Object.keys(priceWhere).length > 0) {
            const priceProducts = await prisma.product.findMany({
              where: {
                ...priceWhere,
                deleted_at: null,
              },
              select: { id: true },
            });
            priceProducts.forEach((p) => productIds.add(p.id.toString()));
          }
        } else {
          // Use ProductFilterValue for other filters
          const filterValues = await prisma.productFilterValue.findMany({
            where: {
              filter_key_id: filterKey.id,
              OR: [
                { raw_value: singleValue },
                {
                  option: {
                    OR: [
                      { value: singleValue },
                      { display_value: singleValue },
                    ],
                  },
                },
              ],
            },
            select: { product_id: true },
          });

          filterValues.forEach((fv) =>
            productIds.add(fv.product_id.toString())
          );
        }
      } // End of single value loop

      // Intersect with previous results (AND logic)
      if (isFirstFilter) {
        filteredProductIds = productIds;
        isFirstFilter = false;
      } else {
        filteredProductIds = new Set(
          [...filteredProductIds].filter((id) => productIds.has(id))
        );
      }
    }

    // Convert back to BigInt for database query
    const productIdsArray = Array.from(filteredProductIds).map((id) =>
      BigInt(id)
    );

    // Filter products based on the filtered IDs
    let finalProducts;
    if (productIdsArray.length > 0) {
      finalProducts = allProducts.filter((product) =>
        productIdsArray.some((id) => id.toString() === product.id.toString())
      );
    } else if (Object.keys(filterParams).length > 0) {
      // No products match the filters
      finalProducts = [];
    } else {
      // No filters applied
      finalProducts = allProducts;
    }

    // Apply pagination to final results
    const total = finalProducts.length;
    const paginatedProducts = finalProducts.slice(skip, skip + take);
    const productsWithCalculations = paginatedProducts.map(
      calculateProductPrices
    );

    res.json({
      products: productsWithCalculations,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total_count: total,
        total_pages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get products", error: error.message });
  }
};

export const getProductById = async (req, res) => {
  try {
    const product = await prisma.product.findFirst({
      where: { id: BigInt(req.params.id), deleted_at: null },
      include: { product_colors: true },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }
    const productWithCalculations = calculateProductPrices(product);
    const in_stock = Number(productWithCalculations.quantity) > 0;
    res.json({ ...productWithCalculations, in_stock });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to get product", error: error.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const data = req.body;
    // Upload new images if provided
    let imageUrls;
    if (Array.isArray(req.files) && req.files.length > 0) {
      const uploads = await Promise.all(
        req.files.map((file) =>
          cloudinary.uploader.upload(file.path, { folder: "products" })
        )
      );
      imageUrls = uploads.map((u) => u.secure_url);
    }

    // Parse specs/specs_detail if sent as JSON string
    const parsedSpecs =
      typeof data.specs === "string"
        ? (() => {
            try {
              return JSON.parse(data.specs);
            } catch {
              return undefined;
            }
          })()
        : data.specs;

    const parsedSpecsDetail =
      typeof data.specs_detail === "string"
        ? (() => {
            try {
              return JSON.parse(data.specs_detail);
            } catch {
              return undefined;
            }
          })()
        : data.specs_detail;

    // Parse product colors
    let colorsInput = [];
    if (typeof data.product_colors === "string") {
      try {
        colorsInput = JSON.parse(data.product_colors);
      } catch {
        colorsInput = [];
      }
    } else if (
      Array.isArray(data.product_colors) &&
      data.product_colors.length
    ) {
      colorsInput = data.product_colors;
    } else if (Array.isArray(data.color)) {
      // legacy fallback
      colorsInput = data.color;
    }

    // Parse img array if sent as JSON string
    const parsedImg =
      typeof data.img === "string"
        ? (() => {
            try {
              return JSON.parse(data.img);
            } catch {
              return data.img;
            }
          })()
        : data.img;

    // Helpers to safely parse IDs
    const parseBigIntOrUndefined = (v) => {
      if (v === undefined || v === null || v === "") return undefined;
      const num = Number(v);
      if (Number.isNaN(num)) return undefined;
      return BigInt(num);
    };
    const parseSubCategory = (v) => {
      if (v === undefined) return undefined;
      if (v === null || v === "") return null;
      const num = Number(v);
      if (Number.isNaN(num)) return null;
      return BigInt(num);
    };

    const updatedProduct = await prisma.$transaction(async (tx) => {
      const updated = await tx.product.update({
        where: { id: BigInt(req.params.id) },
        data: {
          name: data.name ?? undefined,
          price: data.price !== undefined ? Number(data.price) : undefined,
          discount:
            data.discount !== undefined ? Number(data.discount) : undefined,
          img: imageUrls ?? parsedImg ?? undefined,
          specs: parsedSpecs ?? undefined,
          specs_detail: parsedSpecsDetail ?? undefined,
          category_id: parseBigIntOrUndefined(data.category_id),
          sub_category_id: parseSubCategory(data.sub_category_id),
          description: data.description ?? undefined,
        },
      });

      if (colorsInput.length > 0) {
        await tx.productColor.deleteMany({
          where: { product_id: BigInt(req.params.id) },
        });
        await tx.productColor.createMany({
          data: colorsInput.map((c) => ({
            product_id: BigInt(req.params.id),
            name: c.name || "",
            code: c.code || "",
            quantity: Number(c.quantity || 0),
          })),
        });
        const sumQty = colorsInput.reduce(
          (sum, c) => sum + Number(c.quantity || 0),
          0
        );
        await tx.product.update({
          where: { id: BigInt(req.params.id) },
          data: { quantity: sumQty },
        });
        updated.quantity = sumQty;
      } else if (data.quantity !== undefined) {
        await tx.product.update({
          where: { id: BigInt(req.params.id) },
          data: { quantity: Number(data.quantity) },
        });
        updated.quantity = Number(data.quantity);
      }

      return updated;
    });

    res.json({
      message: "Product updated successfully",
      product: updatedProduct,
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to update product", error: error.message });
  }
};

export const deleteProduct = async (req, res) => {
  try {
    await prisma.product.update({
      where: { id: BigInt(req.params.id) },
      data: { deleted_at: new Date() },
    });
    res.json({ message: "Product deleted successfully" });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete product", error: error.message });
  }
};

export const searchProducts = async (req, res) => {
  try {
    const {
      query,
      category_id,
      sub_category_id,
      price_min,
      price_max,
      rating_min,
      sort = "newest",
      page = 1,
      limit = 20,
    } = req.query;

    const where = { deleted_at: null };
    if (query) where.name = { contains: String(query), mode: "insensitive" };
    if (category_id) where.category_id = BigInt(category_id);
    if (sub_category_id) where.sub_category_id = BigInt(sub_category_id);
    if (price_min || price_max) {
      where.price = {};
      if (price_min) where.price.gte = Number(price_min);
      if (price_max) where.price.lte = Number(price_max);
    }
    if (rating_min) where.rating = { gte: Number(rating_min) };

    let orderBy = { created_at: "desc" };
    if (sort === "price-asc") orderBy = { price: "asc" };
    else if (sort === "price-desc") orderBy = { price: "desc" };
    else if (sort === "rating") orderBy = { rating: "desc" };
    else if (sort === "popular") orderBy = { sold: "desc" };

    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const [total_count, products] = await Promise.all([
      prisma.product.count({ where }),
      prisma.product.findMany({
        where,
        orderBy,
        skip,
        take,
      }),
    ]);

    const productsWithCalculations = products.map(calculateProductPrices);

    res.json({
      products: productsWithCalculations,
      pagination: {
        current_page: Number(page),
        per_page: Number(limit),
        total_count: total_count,
        total_pages: Math.max(1, Math.ceil(total_count / Number(limit))),
      },
    });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to search products", error: error.message });
  }
};

export const searchProductsByImage = async (req, res) => {
  try {
    const file = req.file;
    if (!file || !file.buffer) {
      return res.status(400).json({
        success: false,
        message: "Vui lòng tải lên một ảnh sản phẩm.",
      });
    }

    const maxMb = Number(process.env.IMAGE_SEARCH_MAX_FILE_MB || 5);
    const maxBytes = Math.max(1, maxMb) * 1024 * 1024;
    const allowedMimes = new Set(["image/jpeg", "image/png", "image/webp"]);

    if (!allowedMimes.has(file.mimetype)) {
      return res.status(400).json({
        success: false,
        message: "Định dạng ảnh chưa hỗ trợ. Hãy dùng JPG, PNG hoặc WEBP.",
      });
    }
    if (file.size > maxBytes) {
      return res.status(400).json({
        success: false,
        message: `Ảnh vượt quá ${maxMb}MB. Vui lòng chọn ảnh nhỏ hơn.`,
      });
    }

    const detected = await detectProductFromImage({
      buffer: file.buffer,
      mimeType: file.mimetype,
    });

    const detectedType = normalizeText(detected.product_type);
    const detectedBrand = normalizeText(detected.brand);
    const detectedModel = normalizeText(detected.line_or_model);
    const detectedQuery = normalizeText(detected.search_query);

    let exactCandidates = [];
    if (detectedModel) {
      exactCandidates = await prisma.product.findMany({
        where: {
          deleted_at: null,
          name: { contains: detected.line_or_model, mode: "insensitive" },
        },
        include: { product_colors: true },
        take: 16,
      });

      if (detectedBrand) {
        exactCandidates = exactCandidates.filter((p) =>
          collectProductTokens(p).includes(detectedBrand)
        );
      }
    }

    const modelTokens = extractMeaningfulTokens(detected.line_or_model, 3);
    const typeHints = buildTypeHints({
      detectedType: detected.product_type,
      detectedModel: detected.line_or_model,
      detectedSummary: detected.summary,
    });
    const baseQueryTokens = extractMeaningfulTokens(detectedQuery, 2);
    const includeBrandAsToken =
      !detectedModel && !detectedType && baseQueryTokens.length < 4;
    const queryTokens = [
      ...new Set([
        ...modelTokens,
        ...typeHints,
        ...baseQueryTokens,
        ...(includeBrandAsToken ? extractMeaningfulTokens(detectedBrand, 2) : []),
      ]),
    ].slice(0, 12);

    let relatedCandidates = [];
    if (queryTokens.length > 0) {
      relatedCandidates = await prisma.product.findMany({
        where: {
          deleted_at: null,
          OR: queryTokens.flatMap((token) => [
            { name: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
          ]),
        },
        include: { product_colors: true },
        take: 40,
      });
    }

    const scoreProduct = (product) => {
      const haystack = collectProductTokens(product);
      let score = 0;
      let matchedType = 0;
      let matchedModel = 0;
      queryTokens.forEach((token) => {
        if (haystack.includes(token)) score += 1;
      });
      if (detectedBrand && haystack.includes(detectedBrand)) score += 2;
      if (detectedType && haystack.includes(detectedType)) {
        score += 1.5;
        matchedType += 1;
      }
      typeHints.forEach((hint) => {
        if (haystack.includes(hint)) {
          score += 1.2;
          matchedType += 1;
        }
      });
      if (detectedModel && haystack.includes(detectedModel)) {
        score += 4;
        matchedModel += 2;
      }
      modelTokens.forEach((token) => {
        if (haystack.includes(token)) {
          score += 1.8;
          matchedModel += 1;
        }
      });
      const typeOrModelMatched = matchedType > 0 || matchedModel > 0;
      return { score, typeOrModelMatched };
    };

    const exactIds = new Set(exactCandidates.map((p) => p.id.toString()));
    relatedCandidates = relatedCandidates
      .filter((p) => !exactIds.has(p.id.toString()))
      .map((p) => ({ product: p, metrics: scoreProduct(p) }))
      .filter(({ metrics }) => metrics.typeOrModelMatched)
      .filter(({ metrics }) => metrics.score >= (detectedModel ? 3 : 2))
      .sort((a, b) => b.metrics.score - a.metrics.score)
      .map(({ product }) => product);

    let matchMode = "none";
    let notice = "Hiện tại shop chưa có sản phẩm phù hợp với ảnh này.";
    let finalProducts = [];
    let actionHint = "";
    const detectedConfidence = Number(detected?.confidence || 0);
    const detectionWeak =
      (!detectedType && !detectedBrand && !detectedModel) ||
      detectedConfidence < 0.45;

    if (exactCandidates.length > 0) {
      matchMode = "exact";
      const fallbackNotice = buildGeneralProductNotice({
        detected,
        product: exactCandidates[0],
      });
      notice = fallbackNotice;
      finalProducts = exactCandidates.slice(0, 12);
      actionHint =
        "Đây là kết quả khớp cao nhất theo model trong ảnh. Hãy mở sản phẩm để đối chiếu dung lượng, phiên bản và bảo hành.";
    } else if (relatedCandidates.length > 0) {
      matchMode = "related";
      notice =
        "Hiện tại shop chưa có đúng mẫu bạn tìm, dưới đây là sản phẩm liên quan.";
      finalProducts = relatedCandidates.slice(0, 12);
      actionHint =
        "Shop chưa có đúng model, nhưng đã lọc các mẫu cùng loại gần nhất. Bạn có thể chọn một mẫu để so sánh cấu hình và giá.";
    } else {
      actionHint =
        "Chưa tìm thấy sản phẩm phù hợp trong kho hiện tại. Thử ảnh rõ hơn hoặc dùng các truy vấn gợi ý bên dưới để mở rộng tìm kiếm.";
    }

    if (matchMode !== "exact" && detectionWeak) {
      notice =
        "Ảnh có thể là mẫu mới/chưa cập nhật hoặc AI chưa nhận diện đủ chắc chắn. Đang tham khảo thêm thông tin.";
    }

    const products = finalProducts.map(calculateProductPrices);
    const suggestedQueries = buildSuggestedQueries({ detected, products });

    return res.json({
      success: true,
      data: {
        source: "image",
        detected,
        match_mode: matchMode,
        generated_query: detected.search_query,
        notice,
        overview_pending: Boolean(detectedType || detectedBrand || detectedModel),
        action_hint: actionHint,
        suggested_queries: suggestedQueries,
        products,
        pagination: {
          current_page: 1,
          per_page: products.length,
          total_count: products.length,
          total_pages: 1,
        },
      },
    });
  } catch (error) {
    console.error("searchProductsByImage error:", {
      message: error?.message,
      name: error?.name,
    });
    if (String(error?.message || "").includes("MISSING_GEMINI_API_KEY")) {
      return res.status(500).json({
        success: false,
        message:
          "Thiếu GEMINI_API_KEY. Hãy cấu hình key Google AI Studio cho image search.",
      });
    }
    if (String(error?.message || "").includes("Gemini API error 429")) {
      return res.status(500).json({
        success: false,
        message:
          "Gemini đang chạm giới hạn quota/rate-limit. Vui lòng thử lại sau hoặc đổi project/key.",
      });
    }
    if (String(error?.message || "").includes("GEMINI_TIMEOUT")) {
      return res.status(500).json({
        success: false,
        message:
          "Gemini xử lý ảnh quá lâu. Vui lòng thử ảnh khác hoặc thử lại sau.",
      });
    }
    return res.status(500).json({
      success: false,
      message:
        "Không thể phân tích ảnh lúc này. Vui lòng thử ảnh rõ hơn hoặc thử lại sau.",
    });
  }
};

export const getImageSearchOverview = async (req, res) => {
  try {
    const detected = req.body?.detected || {};
    const productName = String(req.body?.product_name || "").trim();
    const fallbackNotice = String(req.body?.fallback_notice || "").trim();

    const hasDetectedInfo = Boolean(
      String(detected?.product_type || "").trim() ||
        String(detected?.brand || "").trim() ||
        String(detected?.line_or_model || "").trim()
    );

    if (!hasDetectedInfo && !productName) {
      return res.status(400).json({
        success: false,
        message: "Missing detected/product_name for overview.",
      });
    }

    const overview =
      (await buildGeneralProductOverview({
        detected,
        productName,
      })) || fallbackNotice;

    return res.json({
      success: true,
      data: {
        overview: overview || "",
      },
    });
  } catch (error) {
    console.error("getImageSearchOverview error:", {
      message: error?.message,
      name: error?.name,
    });
    return res.status(500).json({
      success: false,
      message: "Unable to generate product overview.",
    });
  }
};

export const getProductsByCategory = async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        category_id: BigInt(req.params.categoryId),
        deleted_at: null,
      },
      orderBy: { created_at: "desc" },
    });

    const productsWithCalculations = products.map(calculateProductPrices);

    res.json({
      products: productsWithCalculations,
      pagination: {
        current_page: 1,
        per_page: products.length,
        total_count: products.length,
        total_pages: 1,
      },
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get products by category",
      error: error.message,
    });
  }
};

export const getProductsByShop = async (req, res) => {
  try {
    return res
      .status(400)
      .json({ message: "Shop filter not supported in current schema" });
  } catch (error) {
    res.status(500).json({
      message: "Failed to get products by shop",
      error: error.message,
    });
  }
};

export const uploadProductImages = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(req.params.id) },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (!req.file) {
      return res.status(400).json({ message: "No image file provided" });
    }

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "products",
      width: 500,
      crop: "scale",
    });

    const newImgs = Array.isArray(product.img)
      ? [...product.img, result.secure_url]
      : [result.secure_url];
    const updated = await prisma.product.update({
      where: { id: BigInt(req.params.id) },
      data: { img: newImgs },
    });

    res.json({ message: "Image uploaded successfully", product: updated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to upload image", error: error.message });
  }
};

export const deleteProductImage = async (req, res) => {
  try {
    const product = await prisma.product.findUnique({
      where: { id: BigInt(req.params.id) },
    });
    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    const { imageId } = req.params;
    const filtered = (Array.isArray(product.img) ? product.img : []).filter(
      (url) => url !== imageId
    );
    const updated = await prisma.product.update({
      where: { id: BigInt(req.params.id) },
      data: { img: filtered },
    });

    res.json({ message: "Image deleted successfully", product: updated });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Failed to delete image", error: error.message });
  }
};

export const addSales = async (req, res) => {
  try {
    const { amount, color_name } = req.body;
    const id = BigInt(req.params.id);
    if (!amount || Number(amount) <= 0)
      return res
        .status(400)
        .json({ success: false, message: "Invalid amount" });
    const product = await prisma.product.findUnique({ where: { id } });
    if (!product)
      return res
        .status(404)
        .json({ success: false, message: "Product not found" });

    let colorJson = Array.isArray(product.color) ? [...product.color] : [];
    if (color_name) {
      const idx = colorJson.findIndex(
        (c) => (c.name || c.label) === color_name
      );
      if (idx === -1)
        return res
          .status(422)
          .json({ success: false, message: "Color not found" });
      if (Number(colorJson[idx].quantity || 0) < Number(amount))
        return res
          .status(422)
          .json({ success: false, message: "Insufficient stock for color" });
      colorJson[idx].quantity =
        Number(colorJson[idx].quantity) - Number(amount);
    }

    if (Number(product.quantity) < Number(amount))
      return res
        .status(422)
        .json({ success: false, message: "Insufficient stock" });

    const updated = await prisma.product.update({
      where: { id },
      data: {
        quantity: { decrement: Number(amount) },
        sold: { increment: Number(amount) },
        color: color_name ? colorJson : undefined,
      },
    });

    res.json({ success: true, message: "Sales added", product: updated });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add sales",
      error: error.message,
    });
  }
};

export const addRating = async (req, res) => {
  try {
    const { rating } = req.body;
    const id = BigInt(req.params.id);
    if (!rating || rating < 1 || rating > 5)
      return res
        .status(400)
        .json({ success: false, message: "Invalid rating" });

    const agg = await prisma.review.aggregate({
      where: { product_id: id },
      _avg: { rating: true },
      _count: { rating: true },
    });
    const product = await prisma.product.update({
      where: { id },
      data: { rating: agg._avg.rating ?? rating },
      select: { id: true, rating: true },
    });
    res.json({
      success: true,
      message: "Rating updated",
      product: {
        id: product.id.toString(),
        rating: product.rating,
        number_of_ratings: agg._count.rating || 0,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Failed to add rating",
      error: error.message,
    });
  }
};

export const getSimilarProducts = async (req, res) => {
  try {
    const { id } = req.params;
    const { limit = 6 } = req.query;

    // Get the current product
    const currentProduct = await prisma.product.findFirst({
      where: { id: BigInt(id), deleted_at: null },
      select: { id: true, description: true, category_id: true },
    });

    if (!currentProduct) {
      return res.status(404).json({ message: "Product not found" });
    }

    if (
      !currentProduct.description ||
      currentProduct.description.trim() === ""
    ) {
      // If no description, fallback to category-based similarity
      const similarProducts = await prisma.product.findMany({
        where: {
          category_id: currentProduct.category_id,
          id: { not: BigInt(id) },
          deleted_at: null,
        },
        include: { product_colors: true },
        orderBy: { rating: "desc" },
        take: Number(limit),
      });

      const productsWithCalculations = similarProducts.map(
        calculateProductPrices
      );
      return res.json({
        products: productsWithCalculations,
        similarity_method: "category_based",
      });
    }

    // Use pg_trgm for description similarity
    // First, ensure pg_trgm extension is enabled (this should be done in migration)
    try {
      await prisma.$executeRaw`CREATE EXTENSION IF NOT EXISTS pg_trgm;`;
    } catch (error) {
      console.log(
        "pg_trgm extension might already exist or permission denied:",
        error.message
      );
    }

    // Find similar products using trigram similarity
    // similarity() function returns a value between 0 and 1, where 1 is identical
    const similarProducts = await prisma.$queryRaw`
      SELECT 
        p.id,
        p.name,
        p.price,
        p.discount,
        p.quantity,
        p.img,
        p.specs,
        p.specs_detail,
        p.color,
        p.category_id,
        p.sub_category_id,
        p.rating,
        p.sold,
        p.description,
        p.created_at,
        p.updated_at,
        similarity(p.description, ${
          currentProduct.description
        }) as similarity_score
      FROM products p
      WHERE p.id != ${BigInt(id)}
        AND p.deleted_at IS NULL
        AND p.description IS NOT NULL
        AND p.description != ''
        AND similarity(p.description, ${currentProduct.description}) > 0.1
      ORDER BY similarity_score DESC, p.rating DESC NULLS LAST
      LIMIT ${Number(limit)};
    `;

    // If no similar products found by description, fallback to category
    if (similarProducts.length === 0) {
      const categoryProducts = await prisma.product.findMany({
        where: {
          category_id: currentProduct.category_id,
          id: { not: BigInt(id) },
          deleted_at: null,
        },
        include: { product_colors: true },
        orderBy: { rating: "desc" },
        take: Number(limit),
      });

      const productsWithCalculations = categoryProducts.map(
        calculateProductPrices
      );
      return res.json({
        products: productsWithCalculations,
        similarity_method: "category_fallback",
      });
    }

    // Get product colors for similar products
    const productIds = similarProducts.map((p) => p.id);
    const productColors = await prisma.productColor.findMany({
      where: { product_id: { in: productIds } },
    });

    // Group colors by product_id
    const colorsByProduct = productColors.reduce((acc, color) => {
      const productId = color.product_id.toString();
      if (!acc[productId]) acc[productId] = [];
      acc[productId].push(color);
      return acc;
    }, {});

    // Add product_colors to each product and calculate prices
    const productsWithColors = similarProducts.map((product) => ({
      ...product,
      id: product.id.toString(), // Convert BigInt to string for JSON serialization
      category_id: product.category_id.toString(),
      sub_category_id: product.sub_category_id?.toString() || null,
      product_colors: colorsByProduct[product.id.toString()] || [],
    }));

    const productsWithCalculations = productsWithColors.map(
      calculateProductPrices
    );

    res.json({
      products: productsWithCalculations,
      similarity_method: "description_based",
      similarity_threshold: 0.1,
    });
  } catch (error) {
    console.error("Error in getSimilarProducts:", error);
    res.status(500).json({
      message: "Failed to get similar products",
      error: error.message,
    });
  }
};
