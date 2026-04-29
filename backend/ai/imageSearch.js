const GEMINI_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

const IMAGE_SEARCH_ENABLED_RAW = String(
  process.env.IMAGE_SEARCH_ENABLED ?? "true"
).toLowerCase();
const IMAGE_SEARCH_ENABLED = !["0", "false", "off", "no"].includes(
  IMAGE_SEARCH_ENABLED_RAW
);
const IMAGE_SEARCH_MODEL =
  process.env.IMAGE_SEARCH_MODEL || "gemini-3.1-flash-lite-preview";
const IMAGE_SEARCH_FALLBACK_MODEL =
  process.env.IMAGE_SEARCH_FALLBACK_MODEL || "";
const IMAGE_SEARCH_TIMEOUT_MS = Number(
  process.env.IMAGE_SEARCH_TIMEOUT_MS || 60000
);
const IMAGE_SEARCH_RETRY_COUNT = Number(
  process.env.IMAGE_SEARCH_RETRY_COUNT || 1
);

const normalizeStr = (value) => String(value || "").trim();

const normalizeGeminiModelName = (model) => {
  const raw = normalizeStr(model);
  if (!raw) return "gemini-2.5-flash";
  const noProvider = raw.includes("/") ? raw.split("/").pop() : raw;
  return noProvider.replace(/:free$/i, "");
};

const buildEndpointForModel = (modelName) =>
  `${GEMINI_BASE_URL}/models/${encodeURIComponent(
    normalizeGeminiModelName(modelName)
  )}:generateContent?key=${encodeURIComponent(GEMINI_KEY)}`;

const sanitizeAssistantText = (value, maxLen = 220) =>
  normalizeStr(String(value || ""))
    .replace(/\s+/g, " ")
    .slice(0, maxLen);

const requestGeminiText = async ({
  endpoint,
  instructionText,
  mimeType,
  base64,
}) => {
  const attempts = Math.max(1, IMAGE_SEARCH_RETRY_COUNT + 1);
  let lastError = null;

  for (let attempt = 1; attempt <= attempts; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), IMAGE_SEARCH_TIMEOUT_MS);
    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        signal: controller.signal,
        body: JSON.stringify({
          contents: [
            {
              parts: [
                { text: instructionText },
                ...(mimeType && base64
                  ? [
                      {
                        inline_data: {
                          mime_type: mimeType,
                          data: base64,
                        },
                      },
                    ]
                  : []),
              ],
            },
          ],
          generationConfig: {
            temperature: 0,
            maxOutputTokens: 320,
          },
        }),
      });

      const raw = await response.text();
      if (!response.ok) {
        let detail = raw;
        try {
          const parsed = JSON.parse(raw);
          detail = parsed?.error?.message || detail;
        } catch {}
        throw new Error(`Gemini API error ${response.status}: ${detail}`);
      }

      const parsed = JSON.parse(raw);
      const parts = parsed?.candidates?.[0]?.content?.parts || [];
      return parts
        .map((part) => part?.text)
        .filter(Boolean)
        .join("\n");
    } catch (error) {
      if (error?.name === "AbortError") {
        lastError = new Error("GEMINI_TIMEOUT");
      } else {
        lastError = error;
      }
      const message = String(lastError?.message || "");
      const retryable =
        message === "GEMINI_TIMEOUT" ||
        message.includes("Gemini API error 503") ||
        message.includes("Gemini API error 429");
      if (retryable && attempt < attempts) {
        await new Promise((resolve) => setTimeout(resolve, 500 * attempt));
        continue;
      }
      throw lastError;
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError || new Error("GEMINI_REQUEST_FAILED");
};

const parseKeyValueBlock = (text) => {
  const out = {
    product_type: "",
    brand: "",
    line_or_model: "",
    search_query: "",
    summary: "",
    confidence: 0.45,
  };

  String(text || "")
    .split("\n")
    .map((line) => line.trim())
    .forEach((line) => {
      const match = line.match(
        /^(product_type|brand|line_or_model|search_query|summary|confidence)\s*[:=]\s*(.*)$/i
      );
      if (!match) return;
      const key = String(match[1] || "").toLowerCase();
      const value = normalizeStr(match[2]);
      if (key === "confidence") {
        const numeric = Number(value);
        out.confidence = Number.isFinite(numeric)
          ? Math.max(0, Math.min(1, numeric))
          : 0.45;
        return;
      }
      out[key] = value;
    });

  return out;
};

const fallbackDetection = (text) => {
  const parsed = parseKeyValueBlock(text);
  const summary = parsed.summary || "AI chưa nhận diện rõ từ ảnh này.";
  const searchQuery =
    parsed.search_query ||
    [parsed.brand, parsed.line_or_model, parsed.product_type]
      .filter(Boolean)
      .join(" ");
  return {
    product_type: normalizeStr(parsed.product_type),
    brand: normalizeStr(parsed.brand),
    line_or_model: normalizeStr(parsed.line_or_model),
    search_query: normalizeStr(searchQuery),
    summary: sanitizeAssistantText(summary, 140),
    confidence: Number(parsed.confidence || 0.45),
  };
};

export const buildGeneralProductOverview = async ({
  detected = {},
  productName = "",
} = {}) => {
  if (!IMAGE_SEARCH_ENABLED || !GEMINI_KEY) return "";
  const topic = [
    productName ? `Tên sản phẩm: ${productName}` : "",
    detected?.product_type ? `Loại: ${detected.product_type}` : "",
    detected?.brand ? `Hãng: ${detected.brand}` : "",
    detected?.line_or_model ? `Dòng/model: ${detected.line_or_model}` : "",
  ]
    .filter(Boolean)
    .join(" | ");
  if (!topic) return "";

  try {
    const text = await requestGeminiText({
      endpoint: buildEndpointForModel(IMAGE_SEARCH_MODEL),
      instructionText: [
        "Bạn là trợ lý tư vấn sản phẩm điện tử.",
        "Viết 1-2 câu ngắn tiếng Việt về nhu cầu sử dụng và điểm nổi bật chính của dòng sản phẩm này.",
        "Không markdown, không lan man, tối đa 220 ký tự.",
        `Thông tin đầu vào: ${topic}`,
      ].join("\n"),
    });
    return sanitizeAssistantText(text, 220);
  } catch {
    return "";
  }
};

export const detectProductFromImage = async ({ buffer, mimeType }) => {
  if (!IMAGE_SEARCH_ENABLED) throw new Error("IMAGE_SEARCH_DISABLED");
  if (!GEMINI_KEY) throw new Error("MISSING_GEMINI_API_KEY");

  const endpointPrimary = buildEndpointForModel(IMAGE_SEARCH_MODEL);
  const endpointFallback =
    IMAGE_SEARCH_FALLBACK_MODEL &&
    normalizeGeminiModelName(IMAGE_SEARCH_FALLBACK_MODEL) !==
      normalizeGeminiModelName(IMAGE_SEARCH_MODEL)
      ? buildEndpointForModel(IMAGE_SEARCH_FALLBACK_MODEL)
      : "";
  const endpoints = [endpointPrimary, ...(endpointFallback ? [endpointFallback] : [])];
  const base64 = buffer.toString("base64");

  const prompt = [
    "Bạn là hệ thống nhận diện sản phẩm điện tử từ hình ảnh.",
    "Trả về đúng 6 dòng key:value, không thêm text khác:",
    "product_type: ...",
    "brand: ...",
    "line_or_model: ...",
    "search_query: ...",
    "summary: ...",
    "confidence: ...",
  ].join("\n");

  let output = "";
  let lastError = null;
  for (let i = 0; i < endpoints.length; i += 1) {
    try {
      output = await requestGeminiText({
        endpoint: endpoints[i],
        instructionText: prompt,
        mimeType,
        base64,
      });
      break;
    } catch (error) {
      lastError = error;
      const message = String(error?.message || "");
      const retryable =
        message === "GEMINI_TIMEOUT" ||
        message.includes("Gemini API error 503") ||
        message.includes("Gemini API error 429");
      if (retryable && i < endpoints.length - 1) continue;
      throw error;
    }
  }
  if (!output && lastError) throw lastError;

  return fallbackDetection(output);
};
