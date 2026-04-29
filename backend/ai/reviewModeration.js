import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { HttpsProxyAgent } from "https-proxy-agent";

const PRODUCT_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";
const OPENROUTER_BASE_URL =
  process.env.OPENROUTER_BASE_URL || "https://openrouter.ai/api/v1";
const OPENROUTER_KEY = process.env.OPENROUTER_API_KEY;
const AI_PROXY_URL =
  process.env.AI_HTTP_PROXY ||
  process.env.HTTPS_PROXY ||
  process.env.HTTP_PROXY ||
  "";

const OPENROUTER_HTTP_AGENT = AI_PROXY_URL
  ? new HttpsProxyAgent(AI_PROXY_URL)
  : undefined;

const MODERATION_ENABLED_RAW = String(
  process.env.REVIEW_MODERATION_ENABLED ?? "true"
).toLowerCase();
const MODERATION_ENABLED = !["0", "false", "off", "no"].includes(
  MODERATION_ENABLED_RAW
);
const MODERATION_MODEL =
  process.env.REVIEW_MODERATION_MODEL ||
  process.env.OPENROUTER_MODEL ||
  "openai/gpt-oss-120b:free";
const MODERATION_TIMEOUT_MS = Number(
  process.env.REVIEW_MODERATION_TIMEOUT_MS || 6000
);

const parseJsonObjectFromText = (text) => {
  if (!text) return null;
  const raw = Array.isArray(text)
    ? text.join("\n")
    : typeof text === "string"
    ? text
    : String(text);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const createModerationModel = () =>
  new ChatOpenAI({
    model: MODERATION_MODEL,
    temperature: 0,
    apiKey: OPENROUTER_KEY,
    timeout: MODERATION_TIMEOUT_MS,
    maxRetries: 1,
    configuration: {
      baseURL: OPENROUTER_BASE_URL,
      httpAgent: OPENROUTER_HTTP_AGENT,
      defaultHeaders: {
        "HTTP-Referer": process.env.OPENROUTER_SITE_URL || PRODUCT_BASE_URL,
        "X-Title": process.env.OPENROUTER_APP_NAME || "Tech Shop Assistant",
      },
    },
  });

export const moderateReviewComment = async (comment) => {
  const clean = String(comment || "").trim();
  if (!clean) {
    return {
      allowed: true,
      reason: "",
      labels: [],
      confidence: 1,
      skipped: true,
    };
  }

  if (!MODERATION_ENABLED || !OPENROUTER_KEY) {
    return {
      allowed: true,
      reason: "",
      labels: [],
      confidence: 1,
      skipped: true,
    };
  }

  try {
    const messages = [
      new SystemMessage(
        [
          "Bạn là hệ thống kiểm duyệt bình luận sản phẩm thương mại điện tử.",
          "Trả về DUY NHẤT một JSON object theo schema:",
          '{"allowed": true|false, "reason": "string", "labels": ["toxic|hate|harassment|sexual|self_harm|spam|other"], "confidence": 0..1}.',
          "allowed=false nếu có nội dung công kích, thù ghét, quấy rối, tình dục thô tục, tự hại, spam, lừa đảo, hoặc cực kỳ phản cảm.",
          "reason phải ngắn gọn, thân thiện, tiếng Việt (<= 120 ký tự).",
          "Nếu an toàn thì reason có thể để rỗng và labels là mảng rỗng.",
        ].join(" ")
      ),
      new HumanMessage(`Bình luận cần kiểm duyệt:\n${clean}`),
    ];

    const response = await createModerationModel().invoke(messages);
    const parsed = parseJsonObjectFromText(response?.content);

    const allowed = Boolean(parsed?.allowed);
    const labels = Array.isArray(parsed?.labels)
      ? parsed.labels.map((x) => String(x).trim()).filter(Boolean).slice(0, 5)
      : [];
    const confidenceRaw = Number(parsed?.confidence);
    const confidence = Number.isFinite(confidenceRaw)
      ? Math.max(0, Math.min(1, confidenceRaw))
      : 0.5;
    const reason = String(parsed?.reason || "").trim().slice(0, 120);

    return {
      allowed,
      reason,
      labels,
      confidence,
      skipped: false,
    };
  } catch (error) {
    console.error("review moderation error:", {
      name: error?.name,
      message: error?.message,
      model: MODERATION_MODEL,
    });

    // Fail-open: do not block review flow when AI moderation is unavailable.
    return {
      allowed: true,
      reason: "",
      labels: [],
      confidence: 0,
      skipped: true,
      error: "moderation_unavailable",
    };
  }
};
