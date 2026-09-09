import { prisma } from "../lib/db.js";
import { parsePagination } from "../lib/pagination.js";

// Logic ghi log da chuyen sang services/audit.service.js. Controller nay gio
// chi con phan doc log cho quan tri vien, dung nhiem vu cua mot bo chuyen doi HTTP.

// Admin xem log (lọc theo action, user, resource, khoảng thời gian, IP)
export const listAuditLogs = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      user_id,
      resource,
      resource_id,
      ip,
      date_from,
      date_to,
      q,
    } = req.query;
    const { skip, take } = parsePagination(page, limit);

    const createdFilter = {};
    if (date_from) {
      createdFilter.gte = new Date(String(date_from));
    }
    if (date_to) {
      const end = new Date(String(date_to));
      end.setHours(23, 59, 59, 999);
      createdFilter.lte = end;
    }

    const where = {
      ...(action && { action: String(action) }),
      ...(user_id && { user_id: BigInt(user_id) }),
      ...(resource && { resource: String(resource) }),
      ...(resource_id && { resource_id: BigInt(resource_id) }),
      ...(ip && { ip: { contains: String(ip) } }),
      ...(Object.keys(createdFilter).length > 0 && {
        created_at: createdFilter,
      }),
      ...(q && {
        OR: [
          { action: { contains: String(q), mode: "insensitive" } },
          { resource: { contains: String(q), mode: "insensitive" } },
        ],
      }),
    };

    const [logs, total] = await Promise.all([
      prisma.auditLog.findMany({
        where,
        orderBy: { created_at: "desc" },
        skip,
        take,
      }),
      prisma.auditLog.count({ where }),
    ]);

    return res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: Number(page),
          limit: take,
          total,
          pages: Math.ceil(total / take),
        },
      },
    });
  } catch (error) {
    console.error("listAuditLogs error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể tải audit log",
    });
  }
};

