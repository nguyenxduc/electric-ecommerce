import { prisma } from "../lib/db.js";
import { compareProductsWithAi } from "../ai/productComparison.js";

/** Keep in sync with frontend/src/client/constants/compare.ts */
const MIN_PRODUCTS = 2;
const MAX_PRODUCTS = 4;

const parseProductIds = (value) => {
  if (!Array.isArray(value)) return [];
  return [...new Set(value.map(Number))]
    .filter((id) => Number.isSafeInteger(id) && id > 0)
    .map(BigInt);
};

export const compareProductsByAi = async (req, res) => {
  try {
    const ids = parseProductIds(req.body?.ids);
    if (ids.length < MIN_PRODUCTS || ids.length > MAX_PRODUCTS) {
      return res.status(400).json({
        success: false,
        code: "INVALID_PRODUCT_COUNT",
        error: `Select between ${MIN_PRODUCTS} and ${MAX_PRODUCTS} products.`,
      });
    }

    const products = await prisma.product.findMany({
      where: {
        id: { in: ids },
        deleted_at: null,
      },
      include: {
        product_colors: true,
      },
    });

    if (products.length !== ids.length) {
      return res.status(404).json({
        success: false,
        code: "PRODUCT_NOT_FOUND",
        error: "One or more selected products no longer exist.",
      });
    }

    const categoryIds = new Set(
      products.map((product) => product.category_id.toString())
    );
    if (categoryIds.size !== 1) {
      return res.status(400).json({
        success: false,
        code: "PRODUCT_CATEGORY_MISMATCH",
        error: "Only products from the same category can be compared.",
      });
    }

    const comparison = await compareProductsWithAi(products);
    return res.json({
      success: true,
      data: comparison,
    });
  } catch (error) {
    console.error("compareProductsByAi error:", error);
    return res.status(502).json({
      success: false,
      code: "AI_COMPARISON_FAILED",
      error: "The AI assistant could not compare these products. Try again.",
    });
  }
};
