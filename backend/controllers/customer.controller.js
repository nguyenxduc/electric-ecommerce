import { getIO } from "../lib/io.js";
import { SHOP_STATUS } from "../constants/status.js";
import { prisma } from "../lib/db.js";
import { grantUpgradeVouchers, getTierByPoints } from "../services/loyalty.service.js";
import { VALID_ROLES } from "../constants/roles.js";
import { parsePagination } from "../lib/pagination.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { writeAuditLog, auditContext } from "../services/audit.service.js";
import { notifyUser } from "../lib/notify.js";
import { ROLES } from "../constants/roles.js";

export const listCustomers = asyncHandler(async (req, res) => {
  const { page = 1, limit = 20, q, role } = req.query;
  const where = { deleted_at: null };
  if (role && VALID_ROLES.includes(String(role))) where.role = String(role);
  if (q) {
    where.OR = [
      { name: { contains: String(q), mode: "insensitive" } },
      { email: { contains: String(q), mode: "insensitive" } },
      { phone: { contains: String(q), mode: "insensitive" } },
    ];
  }

  const { skip, take } = parsePagination(page, limit);

  const [total, users] = await Promise.all([
    prisma.user.count({ where }),
    prisma.user.findMany({
      where,
      orderBy: { created_at: "desc" },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        loyalty_points: true,
        segment: true,
        created_at: true,
        suspended_at: true,
        suspend_reason: true,
      },
      skip,
      take,
    }),
  ]);

  res.json({
    users,
    pagination: {
      current_page: Number(page),
      per_page: Number(limit),
      total_count: total,
      total_pages: Math.max(1, Math.ceil(total / Number(limit))),
    },
  });
});

export const getCustomer = asyncHandler(async (req, res) => {
  const id = BigInt(req.params.id);
  const user = await prisma.user.findFirst({
    where: { id, deleted_at: null },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      loyalty_points: true,
      segment: true,
      created_at: true,
    },
  });
  if (!user) return res.status(404).json({ message: "Customer not found" });
  res.json(user);
});

export const updateCustomer = asyncHandler(async (req, res) => {
  const id = BigInt(req.params.id);
  const { name, role, phone, address } = req.body;
  if (role !== undefined && role !== null && !VALID_ROLES.includes(role)) {
    return res.status(400).json({
      message: `Invalid role. Allowed values: ${VALID_ROLES.join(", ")}`,
    });
  }
  const updated = await prisma.user.update({
    where: { id },
    data: {
      name: name ?? undefined,
      role: role ?? undefined,
      phone: phone ?? undefined,
      address: address ?? undefined,
    },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      phone: true,
      address: true,
      loyalty_points: true,
      segment: true,
      created_at: true,
    },
  });
  res.json({ message: "Customer updated successfully", user: updated });
});

const TIER_MIN_POINTS = {
  BRONZE: 0,
  SILVER: 500,
  GOLD: 2000,
  PLATINUM: 5000,
};

export const updateCustomerTier = asyncHandler(async (req, res) => {
  const id = BigInt(req.params.id);
  const nextTier = String(req.body?.segment || "").toUpperCase();
  if (!["BRONZE", "SILVER", "GOLD", "PLATINUM"].includes(nextTier)) {
    return res.status(400).json({ message: "Invalid tier segment" });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, loyalty_points: true, segment: true },
  });
  if (!user) {
    return res.status(404).json({ message: "Customer not found" });
  }

  const minPoints = TIER_MIN_POINTS[nextTier];
  const currentPoints = user.loyalty_points || 0;

  const updated = await prisma.$transaction(async (tx) => {
    const fromTier = user.segment || getTierByPoints(currentPoints).key;
    const nextPoints = currentPoints < minPoints ? minPoints : currentPoints;

    await grantUpgradeVouchers(tx, id, fromTier, nextTier);

    return tx.user.update({
      where: { id },
      data: {
        segment: nextTier,
        // Keep consistency: when set higher tier, points are lifted to tier floor.
        loyalty_points: nextPoints,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        loyalty_points: true,
        segment: true,
        created_at: true,
      },
    });
  });

  return res.json({ message: "Customer tier updated successfully", user: updated });
});

export const updateCustomerPoints = asyncHandler(async (req, res) => {
  const id = BigInt(req.params.id);
  const rawPoints = req.body?.loyalty_points;
  const nextPoints = Number.parseInt(rawPoints, 10);
  if (!Number.isInteger(nextPoints) || nextPoints < 0) {
    return res.status(400).json({ message: "Invalid loyalty points" });
  }

  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, loyalty_points: true, segment: true },
  });
  if (!user) {
    return res.status(404).json({ message: "Customer not found" });
  }

  const fromTier = user.segment || getTierByPoints(user.loyalty_points || 0).key;
  const toTier = getTierByPoints(nextPoints).key;

  const updated = await prisma.$transaction(async (tx) => {
    await grantUpgradeVouchers(tx, id, fromTier, toTier);
    return tx.user.update({
      where: { id },
      data: {
        loyalty_points: nextPoints,
        segment: toTier,
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        phone: true,
        address: true,
        loyalty_points: true,
        segment: true,
        created_at: true,
      },
    });
  });

  return res.json({ message: "Customer points updated successfully", user: updated });
});

export const deleteCustomer = asyncHandler(async (req, res) => {
  const id = BigInt(req.params.id);
  await prisma.user.update({
    where: { id },
    data: { deleted_at: new Date() },
  });
  res.json({ message: "Customer deleted successfully" });
});

// PATCH /api/customers/:id/suspend { reason } - khoa tai khoan: chan dang nhap
// va tu choi ca token dang dung (protectRoute doc suspended_at moi request)
const OWNER_SUSPENDED = "Owner account suspended";

export const suspendCustomer = asyncHandler(async (req, res) => {
  const reason = String(req.body?.reason ?? "").trim();
  if (reason.length < 5 || reason.length > 500) {
    return res.status(400).json({ message: "Reason must be 5-500 characters" });
  }
  const id = BigInt(req.params.id);
  if (String(id) === req.user.id) {
    return res.status(400).json({ message: "You cannot suspend your own account" });
  }
  const user = await prisma.user.findFirst({
    where: { id, deleted_at: null },
    select: { role: true },
  });
  if (!user) return res.status(404).json({ message: "Customer not found" });
  if (user.role === ROLES.ADMIN) {
    return res.status(403).json({ message: "Admin accounts cannot be suspended" });
  }
  const suspended_at = new Date();
  await prisma.$transaction([
    prisma.user.update({ where: { id }, data: { suspended_at, suspend_reason: reason } }),
    // Seller bi khoa khong xu ly don duoc: treo shop de nguoi mua khong dat them.
    // Danh dau ly do de mo khoa chi khoi phuc dung shop bi treo vi viec nay.
    prisma.shop.updateMany({
      where: { owner_id: id, status: SHOP_STATUS.ACTIVE, deleted_at: null },
      data: { status: SHOP_STATUS.SUSPENDED, rejection_reason: OWNER_SUSPENDED },
    }),
  ]);
  // Socket dang mo chi duoc kiem tra luc handshake: ngat ngay de khong gui tin nhan tiep
  getIO()?.in(`user_${id}`).disconnectSockets(true);
  writeAuditLog({
    ...auditContext(req),
    action: "USER_SUSPEND",
    resource: "user",
    resourceId: id,
    metadata: { reason },
  });
  // Nguoi bi khoa doc duoc khi duoc mo lai
  notifyUser({
    userId: id,
    title: "Account suspended",
    message: `Your account was suspended: ${reason}`,
    type: "SYSTEM",
  });
  res.json({ message: "Customer suspended", user: { id: Number(id), suspended_at, suspend_reason: reason } });
});

// PATCH /api/customers/:id/unsuspend - mo khoa tai khoan
export const unsuspendCustomer = asyncHandler(async (req, res) => {
  const id = BigInt(req.params.id);
  // Mot giao dich: khong de user da mo khoa ma shop van bi treo
  const [{ count }] = await prisma.$transaction([
    prisma.user.updateMany({
      where: { id, deleted_at: null },
      data: { suspended_at: null, suspend_reason: null },
    }),
    prisma.shop.updateMany({
      where: { owner_id: id, status: SHOP_STATUS.SUSPENDED, rejection_reason: OWNER_SUSPENDED },
      data: { status: SHOP_STATUS.ACTIVE, rejection_reason: null },
    }),
  ]);
  if (count === 0) return res.status(404).json({ message: "Customer not found" });
  writeAuditLog({ ...auditContext(req), action: "USER_UNSUSPEND", resource: "user", resourceId: id });
  notifyUser({
    userId: id,
    title: "Account restored",
    message: "Your account has been restored. You can sign in again.",
    type: "SYSTEM",
  });
  res.json({ message: "Customer unsuspended", user: { id: Number(id), suspended_at: null } });
});
