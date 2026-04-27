import { randomUUID } from "crypto";
import { prisma } from "../lib/db.js";
import { runAgent } from "../ai/agent.js";
const SYSTEM_PROMPT =
  "Bạn là trợ lý mua sắm cho cửa hàng nội thất điện tử. Trả lời ngắn gọn, rõ ràng, ưu tiên tiếng Việt. Nếu chưa chắc, hãy hỏi lại để làm rõ yêu cầu.";

const ensureChatOwner = async (chatId, userId) => {
  const chat = await prisma.aiChat.findUnique({
    where: { id: BigInt(chatId) },
    select: { id: true, user_id: true },
  });

  if (!chat) {
    return { error: "Chat không tồn tại" };
  }

  if (chat.user_id.toString() !== userId) {
    return { error: "Không có quyền truy cập" };
  }

  return { chat };
};

export const listAiChats = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const where = { user_id: BigInt(req.user.id) };

    const [chats, total] = await Promise.all([
      prisma.aiChat.findMany({
        where,
        orderBy: { updated_at: "desc" },
        skip,
        take: Number(limit),
        include: {
          messages: {
            take: 1,
            orderBy: { created_at: "desc" },
          },
        },
      }),
      prisma.aiChat.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        chats,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("listAiChats error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tải danh sách hội thoại",
    });
  }
};

export const createAiChat = async (req, res) => {
  try {
    const { title } = req.body || {};
    const chat = await prisma.aiChat.create({
      data: {
        user_id: BigInt(req.user.id),
        title: title?.trim() || null,
        thread_key: randomUUID(),
      },
    });

    return res.status(201).json({
      success: true,
      data: chat,
    });
  } catch (error) {
    console.error("createAiChat error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tạo hội thoại mới",
    });
  }
};

export const getAiMessages = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { page = 1, limit = 20 } = req.query;
    const ownership = await ensureChatOwner(chatId, req.user.id);

    if (ownership.error) {
      return res
        .status(ownership.error === "Chat không tồn tại" ? 404 : 403)
        .json({
          success: false,
          error: ownership.error,
        });
    }

    const skip = (Number(page) - 1) * Number(limit);

    const [messages, total] = await Promise.all([
      prisma.aiMessage.findMany({
        where: { ai_chat_id: BigInt(chatId) },
        orderBy: { created_at: "asc" },
        skip,
        take: Number(limit),
      }),
      prisma.aiMessage.count({
        where: { ai_chat_id: BigInt(chatId) },
      }),
    ]);

    return res.json({
      success: true,
      data: {
        messages,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("getAiMessages error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tải tin nhắn",
    });
  }
};

export const sendAiChatMessage = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { content } = req.body;

    if (!content || !content.trim()) {
      return res.status(400).json({
        success: false,
        error: "Nội dung tin nhắn không được để trống",
      });
    }

    const ownership = await ensureChatOwner(chatId, req.user.id);
    if (ownership.error) {
      return res
        .status(ownership.error === "Chat không tồn tại" ? 404 : 403)
        .json({
          success: false,
          error: ownership.error,
        });
    }

    const userMessage = await prisma.aiMessage.create({
      data: {
        ai_chat_id: BigInt(chatId),
        role: "user",
        content: content.trim(),
      },
    });

    const text = await runAgent(prisma, chatId);

    const aiMessage = await prisma.aiMessage.create({
      data: {
        ai_chat_id: BigInt(chatId),
        role: "assistant",
        content: text,
      },
    });

    await prisma.aiChat.update({
      where: { id: BigInt(chatId) },
      data: { updated_at: new Date() },
    });

    return res.json({
      success: true,
      data: {
        userMessage,
        aiMessage,
        reply: text,
      },
    });
  } catch (error) {
    console.error("sendAiChatMessage error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể gửi tin nhắn",
    });
  }
};

export const deleteAiChat = async (req, res) => {
  try {
    const { chatId } = req.params;
    const ownership = await ensureChatOwner(chatId, req.user.id);

    if (ownership.error) {
      return res
        .status(ownership.error === "Chat không tồn tại" ? 404 : 403)
        .json({
          success: false,
          error: ownership.error,
        });
    }

    await prisma.aiChat.delete({
      where: { id: BigInt(chatId) },
    });

    return res.json({
      success: true,
      message: "Đã xóa hội thoại",
    });
  } catch (error) {
    console.error("deleteAiChat error:", error);

    return res.status(500).json({
      success: false,
      error: "Không thể xóa hội thoại",
    });
  }
};
