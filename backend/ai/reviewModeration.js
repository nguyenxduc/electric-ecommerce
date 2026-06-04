import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import {
  createGeminiChatModel,
  GEMINI_CHAT_MODEL,
  hasGeminiApiKey,
} from "./geminiConfig.js";

const MODERATION_ENABLED_RAW = String(
  process.env.REVIEW_MODERATION_ENABLED ?? "true"
).toLowerCase();
const MODERATION_ENABLED = !["0", "false", "off", "no"].includes(
  MODERATION_ENABLED_RAW
);
const MODERATION_MODEL =
  process.env.REVIEW_MODERATION_MODEL ||
  process.env.GEMINI_CHAT_MODEL ||
  GEMINI_CHAT_MODEL;
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
  createGeminiChatModel({
    model: MODERATION_MODEL,
    temperature: 0,
    maxRetries: 1,
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

  if (!MODERATION_ENABLED || !hasGeminiApiKey()) {
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

    const response = await Promise.race([
      createModerationModel().invoke(messages),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error("MODERATION_TIMEOUT")), MODERATION_TIMEOUT_MS)
      ),
    ]);
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
