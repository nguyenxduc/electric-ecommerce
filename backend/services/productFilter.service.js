// Giai bo loc dong ra danh sach id san pham.
//
// Bo loc cua san khong co dinh: quan tri vien tu cau hinh khoa loc va gia tri
// loc, con gia tri thi duoc dong bo tu bang thong so ky thuat cua san pham.
// Vi vay khong the viet thang thanh dieu kien Prisma tinh - phai tra bang
// filter_keys, anh xa gia tri hien thi sang gia tri truy van, roi giao cac
// tap ket qua lai voi nhau.
//
// Quy tac: nhieu gia tri trong CUNG mot khoa la OR, giua CAC khoa la AND.
// Vi du ?ram=8GB,16GB&brand=Dell nghia la (8GB hoac 16GB) va Dell.
//
// Truoc day toan bo phan nay nam trong getAllProducts, chiem 186 trong 288
// dong cua handler do.

import { prisma } from "../lib/db.js";

/**
 * @param {Record<string,string|string[]>} filterParams tham so loc lay tu query
 *   string, da loai cac tham so chuan nhu page/limit/sort.
 * @returns {Promise<bigint[]>} id san pham thoa man MOI khoa loc.
 */
export const resolveFilteredProductIds = async (filterParams) => {
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

  return Array.from(filteredProductIds).map((id) => BigInt(id));
};
