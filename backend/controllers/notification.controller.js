import { prisma } from "../lib/db.js";
import { notifyUser } from "../lib/notify.js";
import { parsePagination } from "../lib/pagination.js";
import { asyncHandler } from "../middleware/error.middleware.js";

// Pham vi thong bao cua user: rieng cua ho + broadcast (user_id null)
const scopeOf = (userId) => ({ OR: [{ user_id: userId }, { user_id: null }] });

// Tab o chuong thong bao. SYSTEM gom moi loai con lai (SHOP, SYSTEM, null...)
const TYPE_TABS = ["ORDER", "PROMO"];
const typeWhere = (type) => {
  if (TYPE_TABS.includes(type)) return { type };
  if (type === "SYSTEM") return { OR: [{ type: null }, { type: { notIn: TYPE_TABS } }] };
  return {};
};

// Lấy danh sách thông báo cho user hiện tại
// ?type=ORDER|PROMO|SYSTEM loc theo tab; data.unread dem chua doc theo tab
export const listNotifications = asyncHandler(async (req, res) => {
  const userId = BigInt(req.user.id);
  const { page = 1, limit = 20, unreadOnly, type } = req.query;
  const { skip, take } = parsePagination(page, limit);

  const where = {
    AND: [scopeOf(userId), typeWhere(type)],
    ...(unreadOnly === "true" && { is_read: false }),
  };

  const [notifications, total, unreadByType] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { created_at: "desc" },
      skip,
      take,
    }),
    prisma.notification.count({ where }),
    prisma.notification.groupBy({
      by: ["type"],
      where: { ...scopeOf(userId), is_read: false },
      _count: { _all: true },
    }),
  ]);

  const unread = { total: 0, ORDER: 0, PROMO: 0, SYSTEM: 0 };
  for (const row of unreadByType) {
    const key = TYPE_TABS.includes(row.type) ? row.type : "SYSTEM";
    unread[key] += row._count._all;
    unread.total += row._count._all;
  }

  return res.json({
    success: true,
    data: {
      notifications,
      unread,
      pagination: {
        page: Number(page),
        limit: take,
        total,
        pages: Math.ceil(total / take),
      },
    },
  });
});

// Đánh dấu đã đọc: { ids: [...] } hoặc { all: true } (toàn bộ thông báo của user)
export const markNotificationsRead = asyncHandler(async (req, res) => {
  const userId = BigInt(req.user.id);
  const { ids, all } = req.body || {};

  let where;
  // Chi cap nhat dong cua chinh nguoi dung: dong broadcast chung (user_id null,
  // du lieu cu) ma bi danh dau thi se thanh "da doc" voi tat ca moi nguoi
  if (all === true) {
    where = { user_id: userId, is_read: false };
  } else {
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Danh sách thông báo không hợp lệ",
      });
    }
    // id khong phai so nguyen thi bo qua, khong de BigInt nem loi 500
    const bigIntIds = ids.filter((id) => /^\d+$/.test(String(id))).map((id) => BigInt(id));
    // id cua nguoi khac khong khop scope nen bi bo qua
    where = { id: { in: bigIntIds }, user_id: userId };
  }

  const result = await prisma.notification.updateMany({
    where,
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
});

// Admin tạo thông báo hệ thống (có thể cho 1 user hoặc broadcast)
export const createNotification = asyncHandler(async (req, res) => {
  const { user_id, title, message, type, link } = req.body || {};

  if (!title || !message) {
    return res.status(400).json({
      success: false,
      error: "Title và message là bắt buộc",
    });
  }

  // Gui cho tat ca: tao rieng mot dong cho moi nguoi de ai doc nguoi nay
  if (user_id == null || user_id === "") {
    const users = await prisma.user.findMany({
      where: { deleted_at: null, suspended_at: null },
      select: { id: true },
    });
    const safeLink = typeof link === "string" && link.startsWith("/") && !link.startsWith("//") ? link : null;
    const { count } = await prisma.notification.createMany({
      data: users.map((u) => ({ user_id: u.id, title, message, type: type || "SYSTEM", link: safeLink })),
    });
    return res.status(201).json({ success: true, data: { broadcast: true, recipients: count } });
  }

  const notification = await notifyUser({
    userId: user_id,
    title,
    message,
    type: type || "SYSTEM",
    link,
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
});

