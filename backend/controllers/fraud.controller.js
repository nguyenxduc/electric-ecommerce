import { prisma } from "../lib/db.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { parsePagination, buildPaginationMeta } from "../lib/pagination.js";
import { writeAuditLog } from "../services/audit.service.js";

const STATUSES = ["open", "confirmed", "dismissed"];

// Gan thong tin doi tuong (don/review) vao flag bang 2 query gop, tranh N+1.
const attachSubjects = async (flags) => {
  const ids = (subject) => flags.filter((f) => f.subject === subject).map((f) => f.subject_id);
  const [groups, reviews] = await Promise.all([
    prisma.orderGroup.findMany({
      where: { id: { in: ids("order_group") } },
      select: { id: true, group_number: true, total_amount: true, payment_method: true, user: { select: { email: true } } },
    }),
    prisma.review.findMany({
      where: { id: { in: ids("review") } },
      select: { id: true, comment: true, rating: true, product: { select: { id: true, name: true } }, user: { select: { email: true } } },
    }),
  ]);
  const gMap = new Map(groups.map((g) => [g.id, g]));
  const rMap = new Map(reviews.map((r) => [r.id, r]));
  return flags.map((f) => {
    const s = f.subject === "order_group" ? gMap.get(f.subject_id) : f.subject === "review" ? rMap.get(f.subject_id) : null;
    return { ...f, subject_info: s ?? null };
  });
};

export const listFlags = asyncHandler(async (req, res) => {
  const { status, type, page, limit } = req.query;
  const { currentPage, perPage, skip, take } = parsePagination(page, limit);
  const where = {
    ...(STATUSES.includes(status) && { status }),
    ...(type && { type: String(type) }),
  };
  const [rows, total] = await Promise.all([
    prisma.fraudFlag.findMany({ where, orderBy: { created_at: "desc" }, skip, take }),
    prisma.fraudFlag.count({ where }),
  ]);
  res.json({
    success: true,
    data: await attachSubjects(rows),
    pagination: buildPaginationMeta(currentPage, perPage, total),
  });
});

export const resolveFlag = asyncHandler(async (req, res) => {
  const { status } = req.body || {};
  if (!["confirmed", "dismissed"].includes(status)) {
    return res.status(400).json({ success: false, error: "status must be confirmed or dismissed" });
  }
  const id = BigInt(req.params.id);
  const flag = await prisma.fraudFlag.findUnique({ where: { id } });
  if (!flag) return res.status(404).json({ success: false, error: "Flag not found" });

  const updated = await prisma.fraudFlag.update({
    where: { id },
    data: { status, resolved_by: BigInt(req.user.id), resolved_at: new Date() },
  });
  writeAuditLog({
    userId: req.user.id,
    action: "FRAUD_FLAG_RESOLVE",
    resource: "fraud_flag",
    resourceId: id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { from: flag.status, to: status, type: flag.type },
  });
  res.json({ success: true, data: updated });
});

export const fraudStats = asyncHandler(async (_req, res) => {
  const rows = await prisma.fraudFlag.groupBy({ by: ["type", "status"], _count: { _all: true } });
  const by_type = {};
  const by_status = {};
  for (const r of rows) {
    by_type[r.type] ??= { open: 0, confirmed: 0, dismissed: 0 };
    by_type[r.type][r.status] = r._count._all;
    by_status[r.status] = (by_status[r.status] || 0) + r._count._all;
  }
  res.json({ success: true, data: { by_type, by_status, total: rows.reduce((s, r) => s + r._count._all, 0) } });
});
