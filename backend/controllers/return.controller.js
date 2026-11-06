import { prisma } from "../lib/db.js";
import { writeAuditLog } from "../services/audit.service.js";
import { notifyUser } from "../lib/notify.js";
import { restockOrderItems } from "../lib/restock.js";
import { revertPointsForOrder } from "../services/loyalty.service.js";
import { onOrderReturned } from "../services/invoice.service.js";
import { ROLES } from "../constants/roles.js";
import { ORDER_STATUS, RETURN_STATUS } from "../constants/status.js";
import { asyncHandler } from "../middleware/error.middleware.js";

// POST /api/returns — buyer requests a return on their delivered order
export const createReturnRequest = asyncHandler(async (req, res) => {
  const { order_id, reason } = req.body || {};
  if (!order_id || !reason || !String(reason).trim()) {
    return res
      .status(400)
      .json({ success: false, message: "order_id and reason are required" });
  }

  const order = await prisma.order.findFirst({
    where: { id: BigInt(order_id), deleted_at: null },
    include: { return_request: true, shop: { select: { owner_id: true, name: true } } },
  });
  if (!order || order.user_id.toString() !== req.user.id) {
    return res.status(404).json({ success: false, message: "Order not found" });
  }
  if (order.status !== ORDER_STATUS.DELIVERED) {
    return res.status(400).json({
      success: false,
      message: "Only delivered orders can be returned",
    });
  }
  if (order.return_request) {
    return res.status(400).json({
      success: false,
      message: "A return request already exists for this order",
    });
  }

  const request = await prisma.returnRequest.create({
    data: {
      order_id: order.id,
      user_id: order.user_id,
      shop_id: order.shop_id,
      reason: String(reason).trim(),
    },
  });

  writeAuditLog({
    userId: req.user.id,
    action: "RETURN_REQUEST",
    resource: "order",
    resourceId: order.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { reason: request.reason },
  });

  notifyUser({
    userId: order.shop?.owner_id,
    title: "Return request ↩️",
    message: `Order ${order.order_number} has a return request: "${request.reason}"`,
    type: "ORDER",
  });

  return res.status(201).json({ success: true, data: request });
});

// GET /api/returns/shop/mine — seller: return requests for own shop
export const listShopReturns = asyncHandler(async (req, res) => {
  if (!req.shop) {
    return res
      .status(400)
      .json({ success: false, message: "No shop attached to this account" });
  }
  const { status } = req.query;
  const requests = await prisma.returnRequest.findMany({
    where: {
      shop_id: req.shop.id,
      ...(status && { status: String(status) }),
    },
    include: {
      order: {
        select: {
          id: true,
          order_number: true,
          total_amount: true,
          created_at: true,
        },
      },
      user: { select: { id: true, name: true, email: true } },
    },
    orderBy: { created_at: "desc" },
  });
  return res.json({ success: true, data: { requests } });
});

// PATCH /api/returns/:id/resolve — seller (own shop) or admin approves/rejects.
// Approving restocks the items and marks the order "returned".
export const resolveReturnRequest = asyncHandler(async (req, res) => {
  const { action, note } = req.body || {};
  if (!["approve", "reject"].includes(action)) {
    return res
      .status(400)
      .json({ success: false, message: "action must be approve or reject" });
  }

  const request = await prisma.returnRequest.findUnique({
    where: { id: BigInt(req.params.id) },
    include: { order: { include: { order_items: true } } },
  });
  if (!request) {
    return res
      .status(404)
      .json({ success: false, message: "Return request not found" });
  }
  const isAdmin = req.user.role === ROLES.ADMIN;
  if (!isAdmin && request.shop_id.toString() !== req.shop?.id?.toString()) {
    return res.status(403).json({ success: false, message: "Not authorized" });
  }
  if (request.status !== RETURN_STATUS.PENDING) {
    return res
      .status(400)
      .json({ success: false, message: "Request already resolved" });
  }

  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      // Re-check status atomically - closes the gap between the read
      // above and this write so two concurrent resolutions of the same
      // request (e.g. a seller double-clicking Approve) can't both
      // restock/revert points for the same order.
      const claimed = await tx.returnRequest.updateMany({
        where: { id: request.id, status: RETURN_STATUS.PENDING },
        data: {
          status:
            action === "approve"
              ? RETURN_STATUS.APPROVED
              : RETURN_STATUS.REJECTED,
          resolution_note: note ? String(note).trim() : null,
        },
      });
      if (claimed.count === 0) {
        throw new Error("RETURN_ALREADY_RESOLVED");
      }
      if (action === "approve") {
        await restockOrderItems(tx, request.order.order_items);
        // Returned goods also claw back the loyalty points they earned
        await revertPointsForOrder(tx, request.user_id, request.order_id);
        await tx.order.update({
          where: { id: request.order_id },
          data: { status: ORDER_STATUS.RETURNED },
        });
        await onOrderReturned(tx, request.order);
      }
      return tx.returnRequest.findUniqueOrThrow({ where: { id: request.id } });
    });
  } catch (err) {
    if (err.message === "RETURN_ALREADY_RESOLVED") {
      return res
        .status(409)
        .json({ success: false, message: "Request already resolved" });
    }
    throw err;
  }

  writeAuditLog({
    userId: req.user.id,
    action: action === "approve" ? "RETURN_APPROVE" : "RETURN_REJECT",
    resource: "order",
    resourceId: request.order_id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { note: note || null },
  });

  notifyUser({
    userId: request.user_id,
    title:
      action === "approve" ? "Return approved ✅" : "Return rejected",
    message:
      action === "approve"
        ? `Your return for order ${request.order.order_number} was approved. Refund will be processed.`
        : `Your return for order ${request.order.order_number} was rejected${
            note ? `: ${note}` : "."
          }`,
    type: "ORDER",
  });

  return res.json({ success: true, data: updated });
});
