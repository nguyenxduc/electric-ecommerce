import {
  AIMessage,
  HumanMessage,
  SystemMessage,
} from "@langchain/core/messages";
import {
  ChatGoogleGenerativeAI,
  GoogleGenerativeAIEmbeddings,
} from "@langchain/google-genai";

const MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";
const EMBED_MODEL = process.env.GEMINI_EMBED_MODEL || "text-embedding-004";
const SYSTEM_PROMPT =
  "Bạn là trợ lý mua sắm cho cửa hàng nội thất điện tử. Trả lời ngắn gọn, rõ ràng, ưu tiên tiếng Việt. Khi chưa đủ thông tin, hãy hỏi lại. Khi có dữ liệu sản phẩm, hãy nêu tên, giá và nếu có link ảnh (img) thì đưa URL ảnh để khách xem. Nếu có link sản phẩm, hãy đưa thêm link.";
const PRODUCT_BASE_URL =
  process.env.FRONTEND_BASE_URL || "http://localhost:5173";

const slugify = (str) =>
  (str || "")
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-+/g, "-");

const embeddings = new GoogleGenerativeAIEmbeddings({
  model: EMBED_MODEL,
  apiKey: process.env.GEMINI_API_KEY,
});

const topK = Number(process.env.AI_RETRIEVE_K || 5);
// Số lượng message gần nhất dùng làm ngữ cảnh hội thoại để tránh gửi quá dài
// giúp giảm latency nhưng vẫn đảm bảo AI hiểu câu như "Cái này giá bao nhiêu?".
const MAX_HISTORY = Number(process.env.AI_MAX_HISTORY || 6);

const retrieveContext = async (prisma, question) => {
  try {
    const queryVector = await embeddings.embedQuery(question);
    const vectorLiteral = `[${queryVector.join(",")}]`;
    const rows = await prisma.$queryRawUnsafe(
      `
      SELECT p.id, p.name, p.price, p.img, pe.content
      FROM product_embeddings pe
      JOIN products p ON p.id = pe.product_id
      ORDER BY pe.embedding <-> '${vectorLiteral}'::vector
      LIMIT ${topK};
      `
    );
    return rows ?? [];
  } catch (err) {
    console.error("retrieveContext error:", err);
    return [];
  }
};

export const runAgent = async (prisma, chatId) => {
  const model = new ChatGoogleGenerativeAI({
    model: MODEL,
    temperature: 0.2,
    apiKey: process.env.GEMINI_API_KEY,
  });

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
    ...history.map((m) =>
      m.role === "assistant"
        ? new AIMessage(m.content)
        : new HumanMessage(m.content)
    ),
  ];

  const response = await model.invoke(messages);
  return response.content;
};
