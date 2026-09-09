import { prisma } from "../lib/db.js";
import { notifyUser } from "../lib/notify.js";
import { parsePagination } from "../lib/pagination.js";

// Lấy danh sách thông báo cho user hiện tại
export const listNotifications = async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { page = 1, limit = 20, unreadOnly } = req.query;
    const { skip, take } = parsePagination(page, limit);

    const where = {
      OR: [{ user_id: userId }, { user_id: null }],
      ...(unreadOnly === "true" && { is_read: false }),
    };

    const [notifications, total] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take,
      }),
      prisma.notification.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        notifications,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error("listNotifications error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tải thông báo",
    });
  }
};

// Đánh dấu đã đọc 1 hoặc nhiều thông báo
export const markNotificationsRead = async (req, res) => {
  try {
    const userId = BigInt(req.user.id);
    const { ids } = req.body || {};

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Danh sách thông báo không hợp lệ",
      });
    }

    const bigIntIds = ids.map((id) => BigInt(id));

    const result = await prisma.notification.updateMany({
      where: {
        id: { in: bigIntIds },
        OR: [{ user_id: userId }, { user_id: null }],
      },
      data: {
        is_read: true,
        read_at: new Date(),
      },
    });

    return res.json({
      success: true,
      message: "Đã đánh dấu thông báo là đã đọc",
      data: {
        updated: result.count,
      },
    });
  } catch (error) {
    console.error("markNotificationsRead error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể cập nhật thông báo",
    });
  }
};

// Admin tạo thông báo hệ thống (có thể cho 1 user hoặc broadcast)
export const createNotification = async (req, res) => {
  try {
    const { user_id, title, message, type } = req.body || {};

    if (!title || !message) {
      return res.status(400).json({
        success: false,
        error: "Title và message là bắt buộc",
      });
    }

    const notification = await notifyUser({
      userId: user_id,
      title,
      message,
      type: type || "SYSTEM",
    });

    if (!notification) {
      return res.status(500).json({
        success: false,
        error: "Không thể tạo thông báo",
      });
    }

    return res.status(201).json({
      success: true,
      data: notification,
    });
  } catch (error) {
    console.error("createNotification error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tạo thông báo",
    });
  }
};

