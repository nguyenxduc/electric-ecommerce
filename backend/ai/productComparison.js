import "dotenv/config";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { HttpsProxyAgent } from "https-proxy-agent";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const PRODUCT_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";
const AI_PROXY_URL =
  process.env.AI_HTTP_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  "";
const OPENROUTER_HTTP_AGENT = AI_PROXY_URL
  ? new HttpsProxyAgent(AI_PROXY_URL)
  : undefined;
const COMPARISON_FORM_VERSION = "1.0";
const MAX_TECHNICAL_ROWS = 8;

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
          strengths: (Array.isArray(item?.strengths) ? item.strengths : [])
            .map((value) => asText(value))
            .filter(Boolean)
            .slice(0, 3),
          limitations: (Array.isArray(item?.limitations)
            ? item.limitations
            : []
          )
            .map((value) => asText(value))
            .filter(Boolean)
            .slice(0, 3),
          best_for: asText(item?.best_for, "General use"),
        },
      ])
  );

  const productAssessments = productIds.map((productId) => {
    return (
      assessmentMap.get(String(productId)) || {
        product_id: Number(productId),
        strengths: [],
        limitations: [],
        best_for: "General use",
      }
    );
  });

  const bestChoiceId = allowedIds.has(String(raw?.best_choice?.product_id))
    ? Number(raw.best_choice.product_id)
    : Number(productIds[0]);

  return {
    form_version: COMPARISON_FORM_VERSION,
    summary: asText(raw?.summary, "AI comparison completed."),
    recommendation: asText(
      raw?.recommendation,
      "Choose the product that best matches your priorities."
    ),
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

const createModel = () =>
  new ChatOpenAI({
    model: OPENROUTER_MODEL,
    temperature: 0.1,
    apiKey: OPENROUTER_KEY,
    timeout: 30000,
    maxRetries: 2,
    configuration: {
      baseURL: OPENROUTER_BASE_URL,
      httpAgent: OPENROUTER_HTTP_AGENT,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || PRODUCT_BASE_URL,
        "X-Title": process.env.OPENROUTER_APP_NAME || "Tech Shop Assistant",
      },
    },
  });

export const compareProductsWithAi = async (products) => {
  if (!OPENROUTER_KEY) {
    throw new Error("Missing OPENROUTER_API_KEY");
  }

  const catalog = products.map((product) => ({
    id: Number(product.id),
    name: product.name,
    price: Number(product.price),
    discount: Number(product.discount || 0),
    rating: Number(product.rating || 0),
    sold: Number(product.sold || 0),
    description: product.description || "",
    colors: (product.product_colors || []).map((color) => color.name),
    specifications: flattenSpecs(product.specs, product.specs_detail),
  }));

  const response = await createModel().invoke([
    new SystemMessage(
      [
        "You are the product comparison mode of an electronics shopping chatbot.",
        "Compare only the supplied products and do not invent specifications.",
        "Use concise English suitable for an e-commerce comparison page.",
        "Return only JSON with this exact schema:",
        '{"summary":"string","recommendation":"string","best_choice":{"product_id":1,"reason":"string"},"product_assessments":[{"product_id":1,"strengths":["string"],"limitations":["string"],"best_for":"string"}],"rows":[{"feature":"string","values":[{"product_id":1,"value":"string"}],"insight":"string"}]}',
        "The response is used in a fixed comparison form.",
        "Return exactly one product_assessments item for every supplied product.",
        `Return between 4 and ${MAX_TECHNICAL_ROWS} rows with the most decision-relevant technical specifications.`,
        "Every row must contain one value for every supplied product.",
        "Use N/A when catalog data is missing.",
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
