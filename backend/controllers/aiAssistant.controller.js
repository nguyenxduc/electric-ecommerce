import { randomUUID } from "crypto";
import { prisma } from "../lib/db.js";
import { runAgent } from "../ai/agent.js";
import { writeAuditLog } from "./audit.controller.js";

/**
 * Ghi lại mỗi lần lớp phòng thủ tiêm lệnh chặn một lượt trao đổi.
 * Quản trị viên xem được trong nhật ký thao tác, và đây cũng là nguồn số liệu
 * cho chỉ tiêu "tỉ lệ chặn tấn công" khi báo cáo.
 */
const logGuardBlock = async (req, chatId, result) => {
  if (!result?.blocked) return;
  await writeAuditLog({
    userId: req.user?.id,
    action: "AI_GUARD_BLOCK",
    resource: "ai_chat",
    resourceId: chatId,
    ip: req.ip,
    userAgent: req.get?.("user-agent"),
    metadata: {
      stage: result.blockedAt,
      violations: result.violations?.map((v) => v.id) ?? [],
    },
  });
};

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

    const result = await runAgent(prisma, chatId);
    const text = result.text;
    await logGuardBlock(req, chatId, result);

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
        guard: { blocked: result.blocked, stage: result.blockedAt },
        tools: result.toolCalls,
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

/**
 * Phiên bản trả lời theo luồng (Server-Sent Events).
 *
 * Endpoint cũ vẫn giữ nguyên làm dự phòng cho client không đọc được stream.
 * Các sự kiện phát ra:
 *   meta    - tin nhắn của người dùng đã được lưu, kèm id
 *   token   - một mẩu chữ của câu trả lời
 *   replace - lớp kiểm tra đầu ra đã chặn, client phải thay toàn bộ nội dung
 *             đã hiện bằng nội dung trong sự kiện này
 *   done    - kết thúc, kèm bản ghi tin nhắn đã lưu
 *
 * Vì sao có sự kiện replace: kiểm tra đầu ra chỉ chạy được khi đã có trọn câu
 * trả lời, mà lúc đó người dùng đã đọc được vài dòng. Đây là đánh đổi cố hữu
 * của streaming. Bản lưu vào cơ sở dữ liệu luôn là bản đã qua kiểm tra.
 */
export const streamAiChatMessage = async (req, res) => {
  const { chatId } = req.params;
  const { content } = req.body || {};

  if (!content || !content.trim()) {
    return res
      .status(400)
      .json({ success: false, error: "Nội dung tin nhắn không được để trống" });
  }

  const ownership = await ensureChatOwner(chatId, req.user.id);
  if (ownership.error) {
    return res
      .status(ownership.error === "Chat không tồn tại" ? 404 : 403)
      .json({ success: false, error: ownership.error });
  }

  res.writeHead(200, {
    "Content-Type": "text/event-stream; charset=utf-8",
    "Cache-Control": "no-cache, no-transform",
    Connection: "keep-alive",
    // Tắt đệm của proxy, nếu không thì proxy giữ lại toàn bộ rồi mới nhả ra
    // một lần, đúng thứ mà streaming sinh ra để tránh.
    "X-Accel-Buffering": "no",
  });
  res.flushHeaders?.();

  const send = (event, data) => {
    res.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  };

  let closed = false;
  req.on("close", () => {
    closed = true;
  });

  try {
    const userMessage = await prisma.aiMessage.create({
      data: {
        ai_chat_id: BigInt(chatId),
        role: "user",
        content: content.trim(),
      },
    });
    send("meta", { userMessageId: Number(userMessage.id) });

    const startedAt = Date.now();
    let firstTokenAt = null;

    const result = await runAgent(prisma, chatId, {
      onToken: (piece) => {
        if (closed) return;
        if (firstTokenAt === null) firstTokenAt = Date.now();
        send("token", { text: piece });
      },
    });

    await logGuardBlock(req, chatId, result);

    if (result.blocked) {
      send("replace", { text: result.text, stage: result.blockedAt });
    }

    const aiMessage = await prisma.aiMessage.create({
      data: {
        ai_chat_id: BigInt(chatId),
        role: "assistant",
        content: result.text,
      },
    });

    await prisma.aiChat.update({
      where: { id: BigInt(chatId) },
      data: { updated_at: new Date() },
    });

    send("done", {
      aiMessageId: Number(aiMessage.id),
      reply: result.text,
      guard: { blocked: result.blocked, stage: result.blockedAt },
      tools: result.toolCalls,
      timing: {
        // Hai số đo tách biệt: thời gian tới ký tự đầu tiên là thứ người dùng
        // cảm nhận, thời gian hoàn tất là thứ quyết định chi phí gọi model.
        time_to_first_token_ms:
          firstTokenAt === null ? null : firstTokenAt - startedAt,
        total_ms: Date.now() - startedAt,
      },
    });
  } catch (error) {
    console.error("streamAiChatMessage error:", error);
    send("error", { message: "Không thể gửi tin nhắn" });
  } finally {
    res.end();
  }
};
