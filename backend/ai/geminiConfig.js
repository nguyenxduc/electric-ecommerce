import "dotenv/config";
import { ChatGoogleGenerativeAI } from "@langchain/google-genai";

/** Google AI Studio API key (aistudio.google.com) */
export const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";

/** Chat model — Gemini 3.1 Flash Lite */
export const GEMINI_CHAT_MODEL =
  process.env.GEMINI_CHAT_MODEL ||
  process.env.GEMINI_MODEL ||
  "gemini-3.1-flash-lite";

/** Vision: detect product from uploaded image (multimodal generateContent) */
export const IMAGE_SEARCH_MODEL =
  process.env.IMAGE_SEARCH_MODEL || GEMINI_CHAT_MODEL;

export const IMAGE_SEARCH_FALLBACK_MODEL = String(
  process.env.IMAGE_SEARCH_FALLBACK_MODEL || ""
).trim();

export const GEMINI_BASE_URL =
  process.env.GEMINI_BASE_URL ||
  "https://generativelanguage.googleapis.com/v1beta";

export const hasGeminiApiKey = () => Boolean(GEMINI_API_KEY);

export const assertGeminiApiKey = () => {
  if (!GEMINI_API_KEY) {
    throw new Error("Missing GEMINI_API_KEY (Google AI Studio)");
  }
};

export const normalizeGeminiModelName = (model) => {
  const raw = String(model || "").trim();
  if (!raw) return GEMINI_CHAT_MODEL;
  const noProvider = raw.includes("/") ? raw.split("/").pop() : raw;
  return noProvider.replace(/:free$/i, "");
};

/**
 * LangChain chat model wired to Google AI Studio (Generative Language API).
 */
export const createGeminiChatModel = ({
  model = GEMINI_CHAT_MODEL,
  temperature = 0.2,
  maxOutputTokens,
  maxRetries = 2,
} = {}) =>
  new ChatGoogleGenerativeAI({
    model: normalizeGeminiModelName(model),
    temperature,
    apiKey: GEMINI_API_KEY,
    maxRetries,
    ...(maxOutputTokens ? { maxOutputTokens } : {}),
  });
