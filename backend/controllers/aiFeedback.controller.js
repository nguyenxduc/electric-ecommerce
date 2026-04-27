import { prisma } from "../lib/db.js";

const requireAdmin = (req, res) => {
  if (req.user?.role !== "admin") {
    res.status(403).json({ success: false, error: "Chỉ admin mới được truy cập" });
    return false;
  }
  return true;
};

// Body: { rating: number (1-5), comment?: string, ai_message_id?: string }
export const createAiFeedback = async (req, res) => {
  try {
    const { chatId } = req.params;
    const { rating, comment, ai_message_id } = req.body || {};

    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Rating phải từ 1 đến 5",
      });
    }

    const chat = await prisma.aiChat.findUnique({
      where: { id: BigInt(chatId) },
      select: { id: true, user_id: true },
    });

    if (!chat || chat.user_id.toString() !== req.user.id) {
      return res.status(chat ? 403 : 404).json({
        success: false,
        error: chat ? "Không có quyền truy cập" : "Chat không tồn tại",
      });
    }

    let targetMessage;
    if (ai_message_id) {
      targetMessage = await prisma.aiMessage.findFirst({
        where: {
          id: BigInt(ai_message_id),
          ai_chat_id: BigInt(chatId),
          role: "assistant",
        },
      });
      if (!targetMessage) {
        return res.status(400).json({
          success: false,
          error: "Tin nhắn không hợp lệ để đánh giá",
        });
      }
    } else {
      targetMessage = await prisma.aiMessage.findFirst({
        where: {
          ai_chat_id: BigInt(chatId),
          role: "assistant",
        },
        orderBy: { created_at: "desc" },
      });
      if (!targetMessage) {
        return res.status(400).json({
          success: false,
          error: "Không tìm thấy câu trả lời của bot để đánh giá",
        });
      }
    }

    const userId = BigInt(req.user.id);
    const existing = await prisma.aiFeedback.findFirst({
      where: {
        ai_message_id: targetMessage.id,
        user_id: userId,
      },
    });

    let feedback;
    if (existing) {
      feedback = await prisma.aiFeedback.update({
        where: { id: existing.id },
        data: {
          rating: Number(rating),
          comment: comment?.trim() || null,
        },
      });
    } else {
      feedback = await prisma.aiFeedback.create({
        data: {
          ai_message_id: targetMessage.id,
          user_id: userId,
          rating: Number(rating),
          comment: comment?.trim() || null,
        },
      });
    }

    return res.status(201).json({
      success: true,
      message: "Đã ghi nhận feedback",
      data: feedback,
    });
  } catch (error) {
    console.error("createAiFeedback error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tạo feedback",
    });
  }
};

export const getAiFeedbackStats = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { days = 7 } = req.query;
    const since = new Date();
    since.setDate(since.getDate() - Number(days));

    const [summary, recentBad, byRating] = await Promise.all([
      prisma.$queryRaw`
        SELECT 
          COUNT(*)::int AS total,
          COALESCE(AVG(rating)::float, 0) AS avg_rating,
          SUM(CASE WHEN rating >= 4 THEN 1 ELSE 0 END)::int AS positive,
          SUM(CASE WHEN rating <= 2 THEN 1 ELSE 0 END)::int AS negative
        FROM ai_feedback
        WHERE created_at >= ${since}
      `,
      prisma.aiFeedback.findMany({
        where: {
          created_at: { gte: since },
          rating: { lte: 2 },
        },
        orderBy: { created_at: "desc" },
        take: 20,
      }),
      prisma.$queryRaw`
        SELECT rating, COUNT(*)::int AS count
        FROM ai_feedback
        WHERE created_at >= ${since}
        GROUP BY rating
        ORDER BY rating ASC
      `,
    ]);

    return res.json({
      success: true,
      data: {
        summary: summary?.[0] || null,
        recentBad,
        byRating,
      },
    });
  } catch (error) {
    console.error("getAiFeedbackStats error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tải thống kê feedback",
    });
  }
};

/** Danh sách feedback chi tiết (admin) — hỗ trợ cải thiện prompt & KB */
export const listAiFeedbackAdmin = async (req, res) => {
  try {
    if (!requireAdmin(req, res)) return;

    const { page = 1, limit = 30, min_rating, max_rating } = req.query;
    const skip = (Number(page) - 1) * Number(limit);
    const take = Number(limit);

    const ratingFilter = {};
    if (min_rating) ratingFilter.gte = Number(min_rating);
    if (max_rating) ratingFilter.lte = Number(max_rating);
    const where = Object.keys(ratingFilter).length
      ? { rating: ratingFilter }
      : {};

    const [rows, total] = await Promise.all([
      prisma.aiFeedback.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take,
      }),
      prisma.aiFeedback.count({ where }),
    ]);

    const msgIds = rows.map((r) => r.ai_message_id);
    const messages =
      msgIds.length > 0
        ? await prisma.aiMessage.findMany({
            where: { id: { in: msgIds } },
            select: {
              id: true,
              ai_chat_id: true,
              role: true,
              content: true,
              created_at: true,
            },
          })
        : [];
    const msgMap = new Map(messages.map((m) => [m.id.toString(), m]));

    const chatIds = [...new Set(messages.map((m) => m.ai_chat_id.toString()))];
    const chats =
      chatIds.length > 0
        ? await prisma.aiChat.findMany({
            where: { id: { in: chatIds.map((id) => BigInt(id)) } },
            select: { id: true, title: true, user_id: true },
          })
        : [];
    const chatMap = new Map(chats.map((c) => [c.id.toString(), c]));

    const enriched = rows.map((fb) => {
      const msg = msgMap.get(fb.ai_message_id.toString());
      const chat = msg ? chatMap.get(msg.ai_chat_id.toString()) : null;
      return {
        ...fb,
        message_preview: msg
          ? msg.content.length > 280
            ? `${msg.content.slice(0, 280)}…`
            : msg.content
          : null,
        chat_id: msg?.ai_chat_id ?? null,
        chat_title: chat?.title ?? null,
        user_id_feedback: fb.user_id.toString(),
      };
    });

    return res.json({
      success: true,
      data: {
        items: enriched,
        pagination: {
          page: Number(page),
          limit: Number(limit),
          total,
          pages: Math.ceil(total / Number(limit)),
        },
      },
    });
  } catch (error) {
    console.error("listAiFeedbackAdmin error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tải danh sách feedback",
    });
  }
};
