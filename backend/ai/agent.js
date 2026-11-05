import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import {
  assertGeminiApiKey,
  createGeminiChatModel,
  GEMINI_API_KEY,
  GEMINI_CHAT_MODEL,
  hasGeminiApiKey,
  incrementAiCallCounter,
} from "./geminiConfig.js";
import { pickConfidentSubset, retrieveHybrid } from "./retrieval.js";
import {
  normalizeText,
  slugifyText,
  tokenizeText,
} from "../lib/vietnamese.js";
import { calculateProductPrices } from "../lib/productQuery.js";
import { createShoppingTools, MAX_TOOL_ROUNDS } from "./tools.js";
import {
  INPUT_REFUSAL,
  buildGuardInstruction,
  createContextNonce,
  inspectModelOutput,
  inspectUserInput,
  neutralizeUntrustedText,
  wrapUntrustedBlock,
} from "./guard.js";

const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001";
const EMBED_API_KEY = GEMINI_API_KEY;

const PRODUCT_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";

const SYSTEM_PROMPT = [
  "Bạn là trợ lý mua sắm cho sàn thương mại điện tử đa gian hàng (nhiều shop cùng bán đồ điện tử). Trả lời ngắn gọn, rõ ràng, ưu tiên tiếng Việt.",
  "Khối dữ liệu sản phẩm bên dưới đã kèm giá và tồn kho đọc trực tiếp từ cơ sở dữ liệu ngay trước câu hỏi này. Hãy dùng đúng các con số đó, không làm tròn và không suy diễn.",
  "Chỉ gọi công cụ khi khối dữ liệu không có thứ cần: tồn kho theo từng màu (check_stock), phí vận chuyển của gian hàng (get_shop_policy), hoặc sản phẩm không nằm trong danh sách (lookup_product).",
  "Tuyệt đối không nói giá, tồn kho hay phí vận chuyển từ trí nhớ.",
  "Khi ngữ cảnh có tên gian hàng bán sản phẩm, hãy nhắc đến gian hàng đó (ví dụ: 'bán bởi Tech World').",
  "Khi đề cập đến sản phẩm, hãy đưa đúng URL sản phẩm ở một dòng riêng để hệ thống tự render thành card.",
  "Không bịa link, chỉ dùng đúng các URL do công cụ hoặc ngữ cảnh cung cấp. Nếu chưa đủ thông tin, hãy hỏi lại.",
].join(" ");

const slugify = (str) => slugifyText(str);

const embeddings = EMBED_API_KEY
  ? new GoogleGenerativeAIEmbeddings({
      model: EMBED_MODEL,
      apiKey: EMBED_API_KEY,
    })
  : null;

const topK = Number(process.env.AI_RETRIEVE_K || 5);
const MAX_HISTORY = Number(process.env.AI_MAX_HISTORY || 6);

const logDebugError = (label, err, extra = {}) => {
  const cause = err?.cause;
  console.error(label, {
    name: err?.name,
    message: err?.message,
    stack: err?.stack?.split("\n").slice(0, 6).join("\n"),
    cause:
      cause && typeof cause === "object"
        ? { name: cause.name, message: cause.message, code: cause.code }
        : cause || null,
    ...extra,
  });
};

const normalizeTokens = (text) => tokenizeText(text, 3);

// Gemini dung lai "can nhac" co goi cong cu hay khong moi khi tools duoc bind,
// day la phan lon do tre toi ky tu dau tien (do thuc te: 1.4s khong bind vs
// 4.0s co bind). Khoi ngu canh da co san gia/ton kho cho tung san pham, nen
// chi thuc su can cong cu khi: chua tim duoc san pham nao (can lookup_product),
// hoi theo mau/bien the (can check_stock) hoac hoi phi/thoi gian ship (can
// get_shop_policy).
const TOOL_CUES = [
  "mau", "mau sac", "phien ban mau", "size",
  "ship", "van chuyen", "phi ship", "phi van chuyen", "giao hang", "freeship",
];
export const needsTools = (question, retrieved) => {
  if (!retrieved || retrieved.length === 0) return true;
  const normalized = normalizeText(question);
  return TOOL_CUES.some((cue) => normalized.includes(cue));
};

const hasFollowUpCue = (text) => {
  const normalized = normalizeText(text);

  const staticCues = [
    "cai nay", "san pham nay", "san pham do", "san pham kia", "mau nay",
    "mau do", "con nay", "con do", "no", "them", "loai do", "cai do",
    "cai kia", "vay", "nua",
  ];
  if (staticCues.some((cue) => normalized.includes(cue))) return true;

  return /\b(?:san pham|mau|con|may anh|laptop|dien thoai|tai nghe|dong ho)\s+(?:do|nay|kia)\b/.test(
    normalized
  );
};

const detectTopicShiftHeuristic = (currentText, previousUserText) => {
  if (!currentText || !previousUserText) return false;
  if (hasFollowUpCue(currentText)) return false;

  const currentTokens = [...new Set(normalizeTokens(currentText))];
  const previousTokens = [...new Set(normalizeTokens(previousUserText))];
  if (currentTokens.length < 2 || previousTokens.length < 2) return false;

  const overlap = currentTokens.filter((t) => previousTokens.includes(t)).length;
  const ratio =
    overlap / Math.max(1, Math.min(currentTokens.length, previousTokens.length));

  return ratio < 0.2;
};

const parseJsonObjectFromText = (text) => {
  if (!text) return null;
  const raw = Array.isArray(text) ? text.join("\n") : String(text);
  const match = raw.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const parsed = JSON.parse(match[0]);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch {
    return null;
  }
};

const createResearchModel = () =>
  createGeminiChatModel({
    model: GEMINI_CHAT_MODEL,
    temperature: 0,
    maxRetries: 1,
  });

const createChatModel = () =>
  createGeminiChatModel({
    model: GEMINI_CHAT_MODEL,
    temperature: 0.2,
    maxRetries: 2,
  });

const classifyConversationMode = async ({ latestUserText, recentMessages }) => {
  if (!hasGeminiApiKey() || !latestUserText) return null;
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
    });
    return null;
  }
};

/**
 * Dựng khối ngữ cảnh từ kết quả truy hồi.
 *
 * Mô tả sản phẩm là do người bán tự nhập nên phải coi là dữ liệu không đáng
 * tin: đi qua neutralizeUntrustedText để gỡ mọi câu lệnh giấu trong đó, rồi
 * bọc trong khối có nonce. Nonce làm người bán không đoán được chuỗi đóng
 * khối, nên không thể "thoát" ra ngoài để giả làm chỉ dẫn hệ thống.
 */
const buildContextBlock = (rows, nonce) => {
  if (!rows || rows.length === 0) {
    return { block: "", removedInstructions: 0 };
  }

  let removedInstructions = 0;
  const lines = rows.map((r, idx) => {
    const priced = calculateProductPrices(r);
    const cleaned = neutralizeUntrustedText(r.content ?? "");
    removedInstructions += cleaned.removed;
    const cleanedName = neutralizeUntrustedText(r.name ?? "");
    removedInstructions += cleanedName.removed;
    const link = `${PRODUCT_BASE_URL}/product/${slugify(
      `${r.name}-p${r.id}`
    )}`;
    return [
      `${idx + 1}. product_id=${r.id}`,
      `Tên: ${cleanedName.text}`,
      `Gian hàng: ${r.shop_name ?? ""}`,
      `Giá hiện tại: ${priced.final_price}` +
        (priced.discount > 0 ? ` (giá gốc ${priced.price})` : ""),
      `Tồn kho: ${priced.quantity}`,
      `Mô tả: ${cleaned.text}`,
      `Link: ${link}`,
    ].join(" | ");
  });

  return {
    block: wrapUntrustedBlock(nonce, lines.join("\n")),
    removedInstructions,
  };
};

/** Mã giảm giá đang có hiệu lực, dùng cho lớp kiểm tra đầu ra. */
const loadActiveCouponCodes = async (prisma) => {
  try {
    const now = new Date();
    const rows = await prisma.coupon.findMany({
      where: {
        deleted_at: null,
        OR: [{ expires_at: null }, { expires_at: { gte: now } }],
      },
      select: { code: true },
      take: 200,
    });
    return rows.map((r) => r.code).filter(Boolean);
  } catch (err) {
    logDebugError("loadActiveCouponCodes error:", err);
    return [];
  }
};

/**
 * Gọi model một lượt. Có onToken thì đọc theo luồng và đẩy từng mẩu ra ngoài,
 * không có thì gọi thường.
 *
 * Vẫn stream cả lượt đầu dù lượt đó có thể chỉ chứa yêu cầu gọi công cụ: khi
 * model quyết định gọi công cụ thì phần nội dung rỗng nên không mất gì, còn
 * khi model trả lời thẳng thì người dùng thấy chữ ngay từ lượt đầu.
 */
const runModelTurn = async (model, messages, onToken) => {
  if (!onToken) return model.invoke(messages);

  const stream = await model.stream(messages);
  let merged = null;
  for await (const chunk of stream) {
    merged = merged === null ? chunk : merged.concat(chunk);
    const piece =
      typeof chunk.content === "string"
        ? chunk.content
        : Array.isArray(chunk.content)
        ? chunk.content
            .map((c) => (typeof c === "string" ? c : c?.text || ""))
            .join("")
        : "";
    if (piece) onToken(piece);
  }
  return merged;
};

const messageText = (message) => {
  const content = message?.content;
  if (typeof content === "string") return content;
  if (Array.isArray(content)) {
    return content
      .map((c) => (typeof c === "string" ? c : c?.text || ""))
      .join("");
  }
  return String(content ?? "");
};

/**
 * Chạy trợ lý ảo cho một phiên chat.
 *
 * @param {object} opts.onToken callback nhận từng mẩu chữ khi trả lời theo luồng.
 * @returns {{text:string, blocked:boolean, violations:Array, toolCalls:Array, meta:object}}
 */
export const runAgent = async (prisma, chatId, { onToken = null } = {}) => {
  try {
    assertGeminiApiKey();

    const fullHistory = await prisma.aiMessage.findMany({
      where: { ai_chat_id: BigInt(chatId) },
      orderBy: { created_at: "asc" },
    });

    const history =
      fullHistory.length > MAX_HISTORY
        ? fullHistory.slice(fullHistory.length - MAX_HISTORY)
        : fullHistory;

    const lastUser = history.length ? history[history.length - 1].content : "";

    // Lớp 1 - chặn ngay tại cửa, không tốn một lượt gọi model nào.
    const inputCheck = inspectUserInput(lastUser);
    if (inputCheck.blocked) {
      if (onToken) onToken(INPUT_REFUSAL);
      return {
        text: INPUT_REFUSAL,
        blocked: true,
        blockedAt: "input",
        violations: inputCheck.violations,
        toolCalls: [],
        meta: {},
      };
    }

    const previousUserMessage = [...history]
      .slice(0, -1)
      .reverse()
      .find((m) => m.role === "user");
    const recentForClassifier = [...history]
      .slice(0, -1)
      .slice(-4)
      .map((m) => ({ role: m.role, content: m.content }));

    // Phân loại ngữ cảnh và truy hồi không phụ thuộc nhau, chạy song song để
    // độ trễ là max của hai việc chứ không phải tổng. Trước đây còn một lượt
    // gọi model nữa để mở rộng từ khoá; truy hồi lai đã làm thay việc đó nên
    // lượt gọi ấy được bỏ hẳn khỏi đường tới câu trả lời.
    // Đo thực tế: bộ phân loại ngữ cảnh bằng LLM tốn khoảng 3.3 giây, chiếm
    // phần lớn thời gian tới ký tự đầu tiên, trong khi heuristic dựa trên độ
    // trùng từ khoá cho kết quả tương đương ở hầu hết lượt hỏi và tốn 0 giây.
    // Mặc định dùng heuristic; đặt AI_LLM_TOPIC_CLASSIFIER=1 để bật lại bản
    // gọi model khi cần so sánh chất lượng.
    const useLlmClassifier = process.env.AI_LLM_TOPIC_CLASSIFIER === "1";
    const [modeDecision, retrieved] = await Promise.all([
      useLlmClassifier
        ? classifyConversationMode({
            latestUserText: lastUser,
            recentMessages: recentForClassifier,
          })
        : Promise.resolve(null),
      lastUser
        ? retrieveHybrid(prisma, lastUser, {
            topK,
            embedQuery: embeddings
              ? (text) => {
                  incrementAiCallCounter();
                  return embeddings.embedQuery(text);
                }
              : null,
            onError: (branch, err) =>
              logDebugError(`retrieveHybrid ${branch} error:`, err),
          })
        : Promise.resolve([]),
    ]);

    const aiSaysNewTopic =
      modeDecision?.mode === "new_topic" && modeDecision?.confidence >= 0.65;
    const fallbackTopicShift = modeDecision
      ? false
      : detectTopicShiftHeuristic(lastUser, previousUserMessage?.content || "");
    const isTopicShift = aiSaysNewTopic || fallbackTopicShift;
    const effectiveHistory =
      isTopicShift && history.length > 0
        ? [history[history.length - 1]]
        : history;

    const nonce = createContextNonce();
    // Cau hoi neu dich danh mot san pham (diem RRF vuot troi) thi chi can 1-2
    // ung vien trong ngu canh thay vi ca 5 - giam nhieu tu cac ung vien khong
    // lien quan, nang Context Relevance ma khong doi Recall@5 (do do tren
    // chinh retrieveHybrid, khong qua buoc nay).
    const { block, removedInstructions } = buildContextBlock(
      pickConfidentSubset(retrieved),
      nonce
    );

    const systemText = [
      SYSTEM_PROMPT,
      buildGuardInstruction(nonce),
      block
        ? "\nỨng viên sản phẩm tìm được cho câu hỏi này (dùng product_id bên dưới để gọi công cụ lấy giá và tồn kho):\n" +
          block
        : "",
    ].join(" ");

    const conversation = effectiveHistory.map((m) =>
      m.role === "assistant"
        ? new AIMessage(m.content)
        : new HumanMessage(m.content)
    );

    const { tools, byName } = createShoppingTools(prisma);
    const bindTools = needsTools(lastUser, retrieved);
    const model = bindTools
      ? createChatModel().bindTools(tools)
      : createChatModel();

    // Kết quả công cụ được nạp lại dưới dạng khối số liệu, chứ không đẩy
    // ngược AIMessage chứa functionCall vào lịch sử theo kiểu ReAct chuẩn.
    // Lý do rất cụ thể: Gemini 3 bắt buộc mọi functionCall gửi lại phải kèm
    // thought_signature của chính nó, mà @langchain/google-genai bản đang
    // dùng không giữ trường đó, nên vòng lặp ReAct chuẩn bị API trả về 400.
    // Cách này giữ nguyên phần cốt lõi - mô hình tự chọn công cụ và tự đặt
    // tham số - chỉ khác ở chỗ số liệu quay lại dưới dạng ngữ cảnh.
    const toolCalls = [];
    const facts = [];
    let response = null;
    let rounds = 0;

    while (rounds <= MAX_TOOL_ROUNDS) {
      // Gemini chỉ chấp nhận một system message và nó phải đứng đầu, nên khối
      // số liệu được gộp vào chính system message chứ không nối thêm ở cuối.
      const systemForTurn =
        facts.length === 0
          ? systemText
          : [
              systemText,
              "",
              "Số liệu vừa đọc trực tiếp từ cơ sở dữ liệu tại thời điểm này.",
              "Chỉ dùng đúng các con số dưới đây khi nói về giá, tồn kho và phí vận chuyển.",
              ...facts,
            ].join("\n");
      const turnMessages = [new SystemMessage(systemForTurn), ...conversation];

      response = await runModelTurn(model, turnMessages, onToken);

      const calls = response?.tool_calls ?? [];
      if (calls.length === 0 || rounds === MAX_TOOL_ROUNDS) break;

      for (const call of calls) {
        const impl = byName.get(call.name);
        let output;
        try {
          output = impl
            ? await impl.invoke(call.args)
            : JSON.stringify({ error: `Không có công cụ tên ${call.name}` });
        } catch (err) {
          logDebugError("tool invoke error:", err, { tool: call.name });
          output = JSON.stringify({ error: "Không truy vấn được dữ liệu" });
        }
        toolCalls.push({ name: call.name, args: call.args });
        facts.push(`- ${call.name}(${JSON.stringify(call.args)}) => ${output}`);
      }
      rounds += 1;
    }

    const rawText = messageText(response);

    // Lớp 3 - soi câu trả lời. Khi trả lời theo luồng thì người dùng đã thấy
    // chữ trước khi tới bước này, nên nơi gọi phải phát thêm một sự kiện thay
    // thế nội dung. Đổi lại, bản ghi lưu vào cơ sở dữ liệu luôn là bản đã lọc.
    const knownCouponCodes = await loadActiveCouponCodes(prisma);
    const outputCheck = inspectModelOutput(rawText, { knownCouponCodes });

    return {
      text: outputCheck.text,
      blocked: outputCheck.blocked,
      blockedAt: outputCheck.blocked ? "output" : null,
      violations: outputCheck.violations,
      toolCalls,
      meta: {
        retrieved: retrieved.map((r) => ({
          id: Number(r.id),
          name: r.name,
          sources: r._sources,
        })),
        // Ngu canh that su da dua vao model, ke ca so lieu tra ve tu cong
        // cu. Bo danh gia phai cham diem tren dung thu nay, neu chi cham
        // tren danh sach ten san pham thi Faithfulness bi bao thap gia.
        contextText: block,
        toolFacts: facts,
        topicShift: isTopicShift,
        toolRounds: rounds,
        removedInstructions,
      },
    };
  } catch (err) {
    logDebugError("runAgent invoke error:", err, {
      chatId: String(chatId),
      model: GEMINI_CHAT_MODEL,
      embedModel: EMBED_MODEL,
      hasGeminiKey: hasGeminiApiKey(),
    });
    throw err;
  }
};
