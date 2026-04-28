import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { ChatOpenAI } from "@langchain/openai";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HttpsProxyAgent } from "https-proxy-agent";

const OPENROUTER_MODEL =
  process.env.OPENROUTER_MODEL || "openai/gpt-oss-120b:free";
const EMBED_MODEL =
  process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const EMBED_API_KEY =
  process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || "";
const SYSTEM_PROMPT = [
  "Bạn là trợ lý mua sắm cho cửa hàng đồ điện tử. Trả lời ngắn gọn, rõ ràng, ưu tiên tiếng Việt.",
  "Khi đề cập đến sản phẩm trong ngữ cảnh được cung cấp, hãy đưa đúng URL sản phẩm (dạng http://.../product/<slug>) ở một dòng riêng để hệ thống tự render thành card.",
  "Không cần liệt kê URL ảnh hay lặp lại nhiều link ảnh — frontend sẽ tự lấy ảnh từ link sản phẩm.",
  "Không bịa link, chỉ dùng đúng các URL trong ngữ cảnh. Nếu chưa đủ thông tin, hãy hỏi lại.",
].join(" ");
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

const slugify = (str) =>
  (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const embeddings = EMBED_API_KEY
  ? new GoogleGenerativeAIEmbeddings({
      model: EMBED_MODEL,
      apiKey: EMBED_API_KEY,
    })
  : null;

const topK = Number(process.env.AI_RETRIEVE_K || 5);
// Số lượng message gần nhất dùng làm ngữ cảnh hội thoại để tránh gửi quá dài
// giúp giảm latency nhưng vẫn đảm bảo AI hiểu câu như "Cái này giá bao nhiêu?".
const MAX_HISTORY = Number(process.env.AI_MAX_HISTORY || 6);

const logDebugError = (label, err, extra = {}) => {
  const cause = err?.cause;
  const payload = {
    name: err?.name,
    message: err?.message,
    stack: err?.stack?.split("\n").slice(0, 6).join("\n"),
    cause:
      cause && typeof cause === "object"
        ? {
            name: cause.name,
            message: cause.message,
            code: cause.code,
            type: cause.type,
            errno: cause.errno,
            syscall: cause.syscall,
            hostname: cause.hostname,
          }
        : cause || null,
    ...extra,
  };
  console.error(label, payload);
};

const escapeSqlLiteral = (value) => (value || "").replace(/'/g, "''");

const normalizeTokens = (text) =>
  (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((t) => t.length >= 3);

const hasFollowUpCue = (text) => {
  const normalized = (text || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const staticCues = [
    "cai nay",
    "san pham nay",
    "san pham do",
    "san pham kia",
    "mau nay",
    "mau do",
    "con nay",
    "con do",
    "no",
    "them",
    "loai do",
    "cai do",
    "cai kia",
    "vay",
    "nua",
  ];
  if (staticCues.some((cue) => normalized.includes(cue))) return true;

  // Catch generic references like "<noun> do/nay/kia" (e.g. "may anh do", "laptop nay").
  if (
    /\b(?:san pham|mau|con|may anh|laptop|dien thoai|tai nghe|dong ho)\s+(?:do|nay|kia)\b/.test(
      normalized
    )
  ) {
    return true;
  }

  return false;
};

const detectTopicShiftHeuristic = (currentText, previousUserText) => {
  if (!currentText || !previousUserText) return false;
  if (hasFollowUpCue(currentText)) return false;

  const currentTokens = [...new Set(normalizeTokens(currentText))];
  const previousTokens = [...new Set(normalizeTokens(previousUserText))];
  if (currentTokens.length < 2 || previousTokens.length < 2) return false;

  const overlap = currentTokens.filter((t) => previousTokens.includes(t)).length;
  const ratio = overlap / Math.max(1, Math.min(currentTokens.length, previousTokens.length));

  // Very low overlap and no follow-up cue => likely a new topic.
  return ratio < 0.2;
};

const parseJsonArrayFromText = (text) => {
  if (!text) return [];
  const raw = Array.isArray(text)
    ? text.join("\n")
    : typeof text === "string"
    ? text
    : String(text);
  const match = raw.match(/\[[\s\S]*\]/);
  if (!match) return [];
  try {
    const parsed = JSON.parse(match[0]);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
};

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

const sanitizeToken = (token) =>
  String(token || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9-]/g, "")
    .trim();

const normalizePhrase = (value) =>
  String(value || "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

const createResearchModel = () =>
  new ChatOpenAI({
    model: OPENROUTER_MODEL,
    temperature: 0,
    apiKey: process.env.OPENROUTER_API_KEY,
    timeout: 12000,
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

const classifyConversationMode = async ({ latestUserText, recentMessages }) => {
  if (!OPENROUTER_KEY || !latestUserText) return null;
  try {
    const transcript = (recentMessages || [])
      .map((m, idx) => `${idx + 1}. ${m.role}: ${m.content}`)
      .join("\n");
    const response = await createResearchModel().invoke([
      new SystemMessage(
        [
          "Bạn là bộ phân loại ngữ cảnh hội thoại cho trợ lý bán hàng.",
          "Mục tiêu: quyết định câu user mới là follow_up (đang nói tiếp ngữ cảnh cũ) hay new_topic (đổi chủ đề).",
          "Chỉ trả JSON object với schema:",
          '{"mode":"follow_up|new_topic","confidence":0..1,"reason":"ngắn gọn"}',
          "Không trả markdown, không giải thích thêm.",
        ].join(" ")
      ),
      new HumanMessage(
        `Recent conversation:\n${transcript}\n\nLatest user message: ${latestUserText}`
      ),
    ]);
    const parsed = parseJsonObjectFromText(response?.content);
    const mode = parsed?.mode === "new_topic" ? "new_topic" : "follow_up";
    const confidence = Number(parsed?.confidence);
    return {
      mode,
      confidence: Number.isFinite(confidence) ? confidence : 0.5,
      reason: String(parsed?.reason || ""),
    };
  } catch (err) {
    logDebugError("classifyConversationMode error:", err, {
      latestUserLength: latestUserText?.length ?? 0,
      recentMessageCount: recentMessages?.length ?? 0,
    });
    return null;
  }
};

const buildAICatalogHints = async (prisma) => {
  const rows = await prisma.$queryRawUnsafe(
    `
    SELECT p.name, COALESCE(pe.content, '') AS content
    FROM products p
    LEFT JOIN product_embeddings pe ON p.id = pe.product_id
    WHERE p.deleted_at IS NULL
    ORDER BY p.updated_at DESC NULLS LAST
    LIMIT 30;
    `
  );
  return (rows || [])
    .map((r) => `${r?.name || ""} | ${String(r?.content || "").slice(0, 120)}`)
    .filter(Boolean)
    .join("\n");
};

const expandSemanticTokens = async (prisma, question, baseTokens) => {
  const expanded = new Set(baseTokens);
  let focusTerms = [];
  let strictFocus = false;
  if (!OPENROUTER_KEY || !question) {
    return { tokens: Array.from(expanded), focusTerms, strictFocus };
  }

  try {
    const catalogHints = await buildAICatalogHints(prisma);
    const messages = [
      new SystemMessage(
        [
          "Bạn là bộ mở rộng từ khóa tìm kiếm cho catalog sản phẩm điện tử.",
          "Nhiệm vụ: dựa trên câu hỏi user + danh sách sản phẩm hiện có, trả JSON object để tăng recall nhưng không drift chủ đề.",
          'Schema bắt buộc: {"expand_tokens":[...], "focus_terms":[...], "strict_focus": true|false}',
          "expand_tokens: 4-8 keyword lowercase để mở rộng tìm kiếm.",
          "focus_terms: 1-4 cụm từ thể hiện nhóm sản phẩm chính user đang hỏi (vd: may anh, canon, eos).",
          "strict_focus=true nếu user đang nói rõ 1 nhóm sản phẩm cụ thể (camera/máy ảnh, laptop, tai nghe...).",
          "Chỉ trả JSON object, không giải thích.",
        ].join(" ")
      ),
      new HumanMessage(
        `User query: ${question}\nBase tokens: ${baseTokens.join(
          ", "
        )}\nCatalog hints:\n${catalogHints}`
      ),
    ];

    const response = await createResearchModel().invoke(messages);
    const parsed = parseJsonObjectFromText(response?.content);
    const rawExpandTokens = Array.isArray(parsed?.expand_tokens)
      ? parsed.expand_tokens
      : parseJsonArrayFromText(response?.content);
    const aiTokens = rawExpandTokens
      .map(sanitizeToken)
      .filter((t) => t.length >= 3 && t.length <= 24);
    focusTerms = (Array.isArray(parsed?.focus_terms) ? parsed.focus_terms : [])
      .map(normalizePhrase)
      .filter((t) => t.length >= 3 && t.length <= 40)
      .slice(0, 4);
    strictFocus = Boolean(parsed?.strict_focus);
    aiTokens.forEach((t) => expanded.add(t));
  } catch (err) {
    logDebugError("expandSemanticTokens ai-research error:", err, {
      questionLength: question?.length ?? 0,
      baseTokenCount: baseTokens.length,
    });
  }

  return { tokens: Array.from(expanded), focusTerms, strictFocus };
};

const scoreCandidateRow = (row, tokens, source, focusTerms = []) => {
  const name = String(row?.name || "");
  const content = String(row?.content || "");
  const text = normalizePhrase(`${name} ${content}`);

  let score = 0;
  let tokenHits = 0;
  for (const token of tokens) {
    if (text.includes(token)) {
      tokenHits += 1;
      score += 2;
      if (name.toLowerCase().includes(token)) score += 1;
    }
  }

  if (source.keyword) score += 3;
  if (source.vector) score += 2;
  if (source.keyword && source.vector) score += 3;

  const focusHits = focusTerms.filter((term) => text.includes(term)).length;
  if (focusHits > 0) score += 6 + focusHits * 2;
  else if (focusTerms.length > 0) score -= 2;

  return {
    ...row,
    _score: score,
    _tokenHits: tokenHits,
    _focusHits: focusHits,
  };
};

const rankAndSliceCandidates = (
  rows,
  tokens,
  topN,
  focusTerms = [],
  strictFocus = false
) => {
  const byId = new Map();
  for (const row of rows) {
    const key = String(row?.id ?? "");
    if (!key) continue;
    const prev = byId.get(key);
    if (!prev) {
      byId.set(key, {
        ...row,
        _source: { keyword: Boolean(row?._fromKeyword), vector: Boolean(row?._fromVector) },
      });
      continue;
    }
    prev._source.keyword = prev._source.keyword || Boolean(row?._fromKeyword);
    prev._source.vector = prev._source.vector || Boolean(row?._fromVector);
    // Prefer richer content if current one is empty.
    if (!prev.content && row.content) prev.content = row.content;
    if ((!prev.img || prev.img.length === 0) && row.img) prev.img = row.img;
  }

  const scored = Array.from(byId.values()).map((row) =>
    scoreCandidateRow(row, tokens, row._source, focusTerms)
  );

  const focused =
    strictFocus && focusTerms.length > 0 && scored.some((r) => r._focusHits > 0)
      ? scored.filter((r) => r._focusHits > 0)
      : scored;

  focused.sort((a, b) => {
    if (b._score !== a._score) return b._score - a._score;
    if (b._focusHits !== a._focusHits) return b._focusHits - a._focusHits;
    if (b._tokenHits !== a._tokenHits) return b._tokenHits - a._tokenHits;
    return String(a.name || "").localeCompare(String(b.name || ""));
  });

  return focused.slice(0, topN);
};

const createOpenRouterModel = () =>
  new ChatOpenAI({
    model: OPENROUTER_MODEL,
    temperature: 0.2,
    apiKey: process.env.OPENROUTER_API_KEY,
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

const retrieveContext = async (prisma, question) => {
  const baseTokens = [...new Set(normalizeTokens(question))].slice(0, 6);
  const aiResearch = await expandSemanticTokens(prisma, question, baseTokens);
  const tokens = (aiResearch?.tokens || []).slice(0, 12);
  const focusTerms = aiResearch?.focusTerms || [];
  const strictFocus = Boolean(aiResearch?.strictFocus);
  const candidateLimit = Math.max(topK * 6, 24);
  const keywordClause = tokens
    .map((t) => {
      const safe = escapeSqlLiteral(t);
      return `lower(p.name) LIKE '%${safe}%' OR lower(COALESCE(pe.content, '')) LIKE '%${safe}%'`;
    })
    .join(" OR ");

  let keywordRows = [];
  if (keywordClause) {
    try {
      keywordRows = await prisma.$queryRawUnsafe(
        `
        SELECT p.id, p.name, p.price, p.img, COALESCE(pe.content, '') AS content
        FROM products p
        LEFT JOIN product_embeddings pe ON p.id = pe.product_id
        WHERE p.deleted_at IS NULL
          AND (${keywordClause})
        ORDER BY p.updated_at DESC NULLS LAST
        LIMIT ${candidateLimit};
        `
      );
      keywordRows = keywordRows.map((r) => ({ ...r, _fromKeyword: true }));
    } catch (err) {
      logDebugError("retrieveContext keyword error:", err, {
        questionLength: question?.length ?? 0,
        tokenCount: tokens.length,
      });
    }
  }

  if (!embeddings) {
    return rankAndSliceCandidates(
      keywordRows,
      tokens,
      topK,
      focusTerms,
      strictFocus
    );
  }

  try {
    const queryVector = await embeddings.embedQuery(question);
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const vectorRows = await prisma.$queryRawUnsafe(
      `
      SELECT p.id, p.name, p.price, p.img, pe.content
      FROM product_embeddings pe
      JOIN products p ON p.id = pe.product_id
      WHERE p.deleted_at IS NULL
      ORDER BY pe.embedding <-> '${vectorLiteral}'::vector
      LIMIT ${candidateLimit};
      `
    );
    const taggedVectorRows = (vectorRows ?? []).map((r) => ({
      ...r,
      _fromVector: true,
    }));
    return rankAndSliceCandidates(
      [...(keywordRows ?? []), ...taggedVectorRows],
      tokens,
      topK,
      focusTerms,
      strictFocus
    );
  } catch (err) {
    logDebugError("retrieveContext error:", err, {
      questionLength: question?.length ?? 0,
      embedModel: EMBED_MODEL,
      hasEmbeddingKey: Boolean(EMBED_API_KEY),
    });
    return rankAndSliceCandidates(
      keywordRows ?? [],
      tokens,
      topK,
      focusTerms,
      strictFocus
    );
  }
};

export const runAgent = async (prisma, chatId) => {
  try {
    if (!OPENROUTER_KEY) {
      throw new Error("Missing OPENROUTER_API_KEY");
    }

    const fullHistory = await prisma.aiMessage.findMany({
      where: { ai_chat_id: BigInt(chatId) },
      orderBy: { created_at: "asc" },
    });

    // Chỉ giữ lại một số message gần nhất để làm context (giảm token + độ trễ)
    const history =
      fullHistory.length > MAX_HISTORY
        ? fullHistory.slice(fullHistory.length - MAX_HISTORY)
        : fullHistory;

    const lastUser = history.length ? history[history.length - 1].content : "";
    const previousUserMessage = [...history]
      .slice(0, -1)
      .reverse()
      .find((m) => m.role === "user");
    const recentForClassifier = [...history]
      .slice(0, -1)
      .slice(-4)
      .map((m) => ({ role: m.role, content: m.content }));
    const modeDecision = await classifyConversationMode({
      latestUserText: lastUser,
      recentMessages: recentForClassifier,
    });
    const aiSaysNewTopic =
      modeDecision?.mode === "new_topic" && modeDecision?.confidence >= 0.65;
    const fallbackTopicShift = modeDecision
      ? false
      : detectTopicShiftHeuristic(lastUser, previousUserMessage?.content || "");
    const isTopicShift = aiSaysNewTopic || fallbackTopicShift;
    const effectiveHistory =
      isTopicShift && history.length > 0 ? [history[history.length - 1]] : history;
    const retrieved = lastUser ? await retrieveContext(prisma, lastUser) : [];
    const contextBlock =
      retrieved.length > 0
        ? "Ngữ cảnh sản phẩm:\n" +
          retrieved
            .map((r, idx) => {
              const imgs = Array.isArray(r.img) ? r.img : [];
              const firstImg = imgs[0] || "";
              const slug =
                slugify(r.name + "-p" + r.id || "") || `san-pham-${r.id}`;
              const link = `${PRODUCT_BASE_URL}/product/${slug}`;
              return `${idx + 1}. ${r.name ?? "Sản phẩm"} | Giá: ${
                r.price ?? ""
              } | ${r.content ?? ""}${
                firstImg ? ` | Ảnh: ${firstImg}` : ""
              } | Link: ${link}`;
            })
            .join("\n")
        : "";

    const messages = [
      new SystemMessage(
        SYSTEM_PROMPT +
          (contextBlock
            ? "\nDữ liệu dưới đây là hàng hóa có liên quan, hãy ưu tiên dùng nó khi trả lời:\n" +
              contextBlock
            : "")
      ),
      ...effectiveHistory.map((m) =>
        m.role === "assistant"
          ? new AIMessage(m.content)
          : new HumanMessage(m.content)
      ),
    ];

    const response = await createOpenRouterModel().invoke(messages);
    return response.content;
  } catch (err) {
    logDebugError("runAgent invoke error:", err, {
      chatId: String(chatId),
      model: OPENROUTER_MODEL,
      embedModel: EMBED_MODEL,
      provider: "openrouter",
      hasOpenRouterKey: Boolean(OPENROUTER_KEY),
      hasEmbeddingKey: Boolean(EMBED_API_KEY),
    });
    throw err;
  }
};
