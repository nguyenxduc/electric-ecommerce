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

// Dem luu luong Gemini trong ngay (UTC), chi trong bo nho process: reset khi
// restart va khong cong don giua nhieu instance. Dem o ba cho: tao chat model
// (duoi day), embedQuery trong ai/agent.js, va moi lan fetch Gemini Vision
// trong ai/imageSearch.js (ke ca lan retry).
//
// Van la UOC LUONG: mot chat model duoc tao ra co the phat nhieu luot goi LLM
// (agent loop goi lai model sau moi tool call) nen so nay thap hon so request
// HTTP thuc su gui len Google.
const aiCalls = { day: new Date().toISOString().slice(0, 10), count: 0 };

const rollAiCallDay = () => {
  const today = new Date().toISOString().slice(0, 10);
  if (aiCalls.day !== today) {
    aiCalls.day = today;
    aiCalls.count = 0;
  }
};

export const incrementAiCallCounter = () => {
  rollAiCallDay();
  aiCalls.count += 1;
};

// Phai roll ngay ca khi doc: qua nua dem ma khong co request nao thi se tra ve
// so cua hom qua.
export const aiCallsToday = () => {
  rollAiCallDay();
  return aiCalls.count;
};

/**
 * LangChain chat model wired to Google AI Studio (Generative Language API).
 */
export const createGeminiChatModel = ({
  model = GEMINI_CHAT_MODEL,
  temperature = 0.2,
  maxOutputTokens,
  maxRetries = 2,
} = {}) => {
  incrementAiCallCounter();
  return new ChatGoogleGenerativeAI({
    model: normalizeGeminiModelName(model),
    temperature,
    apiKey: GEMINI_API_KEY,
    maxRetries,
    ...(maxOutputTokens ? { maxOutputTokens } : {}),
  });
};
