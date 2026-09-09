import { prisma } from "../lib/db.js";
import {
  buildGeneralProductOverview,
  detectProductFromImage,
} from "../ai/imageSearch.js";
import { SHOP_STATUS } from "../constants/status.js";
import {
  buyerVisibilityWhere,
  calculateProductPrices,
  shopSelect,
} from "../lib/productQuery.js";
import { asyncHandler } from "../middleware/error.middleware.js";

// Tim kiem san pham bang hinh anh (Gemini Vision).
//
// Tach khoi product.controller.js vi day la mot moi quan tam rieng: nhan dien
// anh roi doi chieu sang danh muc, keo theo ca mot cum helper xu ly van ban
// (chuan hoa, tach token, dung goi y) khong dung o bat ky handler nao khac.

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
          ...buyerVisibilityWhere(req),
          name: { contains: detected.line_or_model, mode: "insensitive" },
        },
        include: { product_colors: true, shop: { select: shopSelect } },
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
          ...buyerVisibilityWhere(req),
          OR: queryTokens.flatMap((token) => [
            { name: { contains: token, mode: "insensitive" } },
            { description: { contains: token, mode: "insensitive" } },
          ]),
        },
        include: { product_colors: true, shop: { select: shopSelect } },
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

export const getImageSearchOverview = asyncHandler(async (req, res) => {
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
});
