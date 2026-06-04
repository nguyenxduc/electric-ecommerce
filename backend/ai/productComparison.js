import "dotenv/config";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  assertGeminiApiKey,
  createGeminiChatModel,
  GEMINI_CHAT_MODEL,
} from "./geminiConfig.js";

const COMPARISON_FORM_VERSION = "1.2";
const MAX_TECHNICAL_ROWS = 12;
const MAX_LIST_ITEMS = 5;
const MAX_KEY_DIFFERENCES = 6;

const flattenSpecs = (specs = [], specsDetail = []) => {
  const merged = new Map();

  for (const spec of Array.isArray(specs) ? specs : []) {
    if (spec?.label) merged.set(String(spec.label), String(spec.value ?? ""));
  }

  for (const detail of Array.isArray(specsDetail) ? specsDetail : []) {
    const items = Array.isArray(detail?.items) ? detail.items : [detail];
    for (const spec of items) {
      if (spec?.label) merged.set(String(spec.label), String(spec.value ?? ""));
    }
  }

  return Array.from(merged, ([label, value]) => ({ label, value }));
};

const parseJsonObject = (value) => {
  const text = Array.isArray(value) ? value.join("\n") : String(value || "");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("AI comparison did not return JSON.");
  return JSON.parse(match[0]);
};

const asText = (value, fallback = "") =>
  typeof value === "string" && value.trim() ? value.trim() : fallback;

const parseWinnerProductId = (value, allowedIds) => {
  if (value == null || value === "") return null;
  const id = Number(value);
  if (!Number.isFinite(id) || !allowedIds.has(String(id))) return null;
  return id;
};

const sanitizeComparison = (raw, productIds) => {
  const allowedIds = new Set(productIds.map(String));

  const valuesByProduct = (values) => {
    const valueMap = new Map(
      (Array.isArray(values) ? values : [])
        .filter((item) => allowedIds.has(String(item?.product_id)))
        .map((item) => [
          String(item.product_id),
          asText(item?.value, "N/A"),
        ])
    );

    return productIds.map((productId) => ({
      product_id: Number(productId),
      value: valueMap.get(String(productId)) || "N/A",
    }));
  };

  const rows = Array.isArray(raw?.rows)
    ? raw.rows
        .map((row) => ({
          feature: asText(row?.feature),
          insight: asText(row?.insight),
          values: valuesByProduct(row?.values),
          winner_product_id: parseWinnerProductId(
            row?.winner_product_id,
            allowedIds
          ),
        }))
        .filter((row) => row.feature)
        .slice(0, MAX_TECHNICAL_ROWS)
    : [];

  if (!rows.length) {
    throw new Error("AI comparison did not return any comparison rows.");
  }

  const assessmentMap = new Map(
    (Array.isArray(raw?.product_assessments) ? raw.product_assessments : [])
      .filter((item) => allowedIds.has(String(item?.product_id)))
      .map((item) => [
        String(item.product_id),
        {
          product_id: Number(item.product_id),
          verdict: asText(item?.verdict),
          strengths: (Array.isArray(item?.strengths) ? item.strengths : [])
            .map((value) => asText(value))
            .filter(Boolean)
            .slice(0, MAX_LIST_ITEMS),
          limitations: (Array.isArray(item?.limitations)
            ? item.limitations
            : []
          )
            .map((value) => asText(value))
            .filter(Boolean)
            .slice(0, MAX_LIST_ITEMS),
          best_for: asText(item?.best_for, "General use"),
        },
      ])
  );

  const productAssessments = productIds.map((productId) => {
    return (
      assessmentMap.get(String(productId)) || {
        product_id: Number(productId),
        verdict: "",
        strengths: [],
        limitations: [],
        best_for: "General use",
      }
    );
  });

  const bestChoiceId = allowedIds.has(String(raw?.best_choice?.product_id))
    ? Number(raw.best_choice.product_id)
    : Number(productIds[0]);

  const keyDifferences = Array.isArray(raw?.key_differences)
    ? raw.key_differences
        .map((item) => asText(item))
        .filter(Boolean)
        .slice(0, MAX_KEY_DIFFERENCES)
    : [];

  const overviewMap = new Map(
    (Array.isArray(raw?.product_overviews) ? raw.product_overviews : [])
      .filter((item) => allowedIds.has(String(item?.product_id)))
      .map((item) => [
        String(item.product_id),
        asText(item?.overview),
      ])
  );

  const productOverviews = productIds.map((productId) => ({
    product_id: Number(productId),
    overview:
      overviewMap.get(String(productId)) ||
      asText(raw?.summary, "").slice(0, 400) ||
      "Overview not available.",
  }));

  return {
    form_version: COMPARISON_FORM_VERSION,
    summary: asText(raw?.summary, "AI comparison completed."),
    recommendation: asText(
      raw?.recommendation,
      "Choose the product that best matches your priorities."
    ),
    key_differences: keyDifferences,
    product_overviews: productOverviews,
    best_choice: {
      product_id: bestChoiceId,
      reason: asText(
        raw?.best_choice?.reason,
        "This product offers the most balanced overall option."
      ),
    },
    product_assessments: productAssessments,
    rows,
  };
};

export const compareProductsWithAi = async (products) => {
  assertGeminiApiKey();

  const catalog = products.map((product) => ({
    id: Number(product.id),
    name: product.name,
    price: Number(product.price),
    final_price:
      Number(product.final_price) > 0
        ? Number(product.final_price)
        : Number(product.price),
    discount: Number(product.discount || 0),
    rating: Number(product.rating || 0),
    sold: Number(product.sold || 0),
    description: product.description || "",
    colors: (product.product_colors || []).map((color) => color.name),
    specifications: flattenSpecs(product.specs, product.specs_detail),
  }));

  const response = await createGeminiChatModel({
    model: GEMINI_CHAT_MODEL,
    temperature: 0.15,
    maxOutputTokens: 8192,
  }).invoke([
    new SystemMessage(
      [
        "You are an expert electronics product comparison writer for an e-commerce site.",
        "Compare ONLY the supplied catalog data. Do not invent specs, prices, or features.",
        "Write in clear English. Be specific, practical, and thorough — shoppers want detail.",
        "Return ONLY valid JSON (no markdown) matching this schema:",
        '{"summary":"string","recommendation":"string","key_differences":["string"],"product_overviews":[{"product_id":number,"overview":"string"}],"best_choice":{"product_id":number,"reason":"string"},"product_assessments":[{"product_id":number,"verdict":"string","best_for":"string","strengths":["string"],"limitations":["string"]}],"rows":[{"feature":"string","values":[{"product_id":number,"value":"string"}],"insight":"string","winner_product_id":number|null}]}',
        "Content requirements:",
        "- summary: 2–3 sentences — high-level comparison only (details go in product_overviews).",
        "- product_overviews: exactly one entry per supplied product_id.",
        "  - overview: 4–6 sentences about THAT product only — strengths vs rivals, specs, price/value, ideal buyer. Be specific.",
        "- recommendation: 2–3 sentences with concrete buying advice for different user priorities.",
        "- key_differences: 4–6 short bullet-style strings highlighting the most important gaps between products.",
        "- product_assessments: exactly one entry per supplied product_id.",
        "  - verdict: one punchy sentence (value proposition).",
        "  - best_for: one sentence on ideal buyer/use case.",
        "  - strengths: 4–5 specific pros grounded in catalog data.",
        "  - limitations: 3–4 honest cons grounded in catalog data.",
        `- rows: ${Math.min(8, MAX_TECHNICAL_ROWS)}–${MAX_TECHNICAL_ROWS} rows for the most decision-relevant specs (battery, noise cancelling, connectivity, chip, storage, display, weight, etc.).`,
        "  - Use catalog specifications first; add price/rating/sold rows only if useful in rows (catalog already has them).",
        "  - values: one entry per product_id; use N/A if missing.",
        "  - insight: 1–2 sentences explaining why the difference matters for buyers.",
        "  - winner_product_id: id of the product that wins THIS row (better value for buyers). Use null if tie or not comparable.",
        "For price-related rows lower is usually better; for rating/sold/battery/spec quality higher is usually better.",
        "best_choice.reason: 2–3 sentences justifying the overall pick.",
      ].join(" ")
    ),
    new HumanMessage(`Compare these products:\n${JSON.stringify(catalog)}`),
  ]);

  const parsed = parseJsonObject(response.content);
  return sanitizeComparison(
    parsed,
    products.map((product) => product.id)
  );
};
