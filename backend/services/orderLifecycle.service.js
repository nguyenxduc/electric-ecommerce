// Vong doi don con: mot cho duy nhat lo viec chuyen trang thai va moi hieu ung
// di kem (tra kho, thu hoi diem, huy thanh toan, xuat hoa don/khau tru thue).
//
// Truoc day logic nay nam trong 3 handler cua order.controller.js. Gio con co
// webhook don vi van chuyen va job huy don qua han cung phai chuyen trang thai,
// chep them 2 ban nua thi moi lan sua quy tac phai sua 5 cho.

import { prisma } from "../lib/db.js";
import { revertPointsForOrder } from "./loyalty.service.js";
import { writeAuditLog } from "./audit.service.js";
import { notifyUser } from "../lib/notify.js";
import { restockOrderItems } from "../lib/restock.js";
import {
  ORDER_STATUS,
  ORDER_STATUS_FLOW,
  PAYMENT_STATUS,
} from "../constants/status.js";
import { onOrderDelivered } from "./invoice.service.js";

// Housekeeping after a suborder is cancelled/deleted:
// 1. Void the checkout's un-paid payments - their amount no longer matches,
//    so the buyer must re-initiate payment (recomputed from active orders).
// 2. When EVERY suborder of the checkout is gone, give the voucher use back.
// 3. If the checkout was already PAID, cancelling this suborder means the
//    buyer is now owed a partial refund. There's no refund ledger in the
//    schema, so the caller is told to record it (as an audit log) instead of
//    the paid/owed amounts silently diverging with no trace anywhere.
export const onSuborderCancelled = async (tx, order) => {
  await tx.payment.updateMany({
    where: { order_group_id: order.order_group_id, status: PAYMENT_STATUS.PENDING },
    data: {
      status: PAYMENT_STATUS.CANCELED,
      message: "Voided: an order in this checkout was cancelled",
    },
  });

  const paidPayment = await tx.payment.findFirst({
    where: { order_group_id: order.order_group_id, status: PAYMENT_STATUS.PAID },
  });

  const activeCount = await tx.order.count({
    where: {
      order_group_id: order.order_group_id,
      status: { not: ORDER_STATUS.CANCELLED },
      deleted_at: null,
    },
  });
  if (activeCount === 0) {
    const group = await tx.orderGroup.findUnique({
      where: { id: order.order_group_id },
      select: { coupon_id: true },
    });
    if (group?.coupon_id) {
      await tx.coupon.updateMany({
        where: { id: group.coupon_id, used_count: { gt: 0 } },
        data: { used_count: { decrement: 1 } },
      });
    }
  }

  return paidPayment
    ? {
        refundOwed: {
          amount: order.total_amount,
          paymentId: paidPayment.id,
          orderGroupId: order.order_group_id,
        },
      }
    : null;
};

export const logRefundOwed = ({ actorUserId, ip, userAgent }, order, refundOwed, reason) => {
  if (!refundOwed) return;
  writeAuditLog({
    userId: actorUserId,
    action: "REFUND_OWED",
    resource: "order",
    resourceId: order.id,
    ip,
    userAgent,
    metadata: {
      order_group_id: refundOwed.orderGroupId.toString(),
      payment_id: refundOwed.paymentId.toString(),
      amount: refundOwed.amount?.toString?.() ?? refundOwed.amount,
      reason: reason || "Suborder cancelled after checkout was already paid",
    },
  });
};

/** Huy don trong giao dich: tra kho, thu hoi diem, don dep thanh toan/voucher. */
export const cancelInTx = async (tx, order) => {
  await restockOrderItems(tx, order.order_items);
  await revertPointsForOrder(tx, order.user_id, order.id);
  const result = await onSuborderCancelled(tx, order);
  return result?.refundOwed || null;
};

const STATUS_LABEL = {
  processing: "is being prepared 📦",
  shipped: "is on the way 🚚",
  delivered: "has been delivered ✅",
  cancelled: "was cancelled ❌",
};

/**
 * Chuyen trang thai mot don con.
 *
 * @param {object} opts
 * @param {bigint|string} opts.orderId
 * @param {string} opts.status trang thai dich
 * @param {string[]} [opts.allowedFrom] ghi de tap trang thai nguon hop le
 *   (mac dinh: suy tu ORDER_STATUS_FLOW)
 * @param {object} [opts.actor] { actorUserId, ip, userAgent } cho audit log;
 *   actorUserId null = he thong (webhook, job)
 * @param {string} [opts.auditAction] mac dinh ORDER_STATUS_UPDATE
 * @param {boolean} [opts.notifyBuyer] mac dinh true
 * @returns {Promise<{ok:true, order:object, previous:string}
 *   | {ok:false, code:"NOT_FOUND"|"INVALID_TRANSITION"|"CONFLICT", message:string}>}
 */
export const transitionOrderStatus = async ({
  orderId,
  status,
  allowedFrom = null,
  actor = {},
  auditAction = "ORDER_STATUS_UPDATE",
  notifyBuyer = true,
  auditMetadata = {},
}) => {
  const order = await prisma.order.findFirst({
    where: { id: BigInt(orderId), deleted_at: null },
    include: { order_items: true },
  });
  if (!order) return { ok: false, code: "NOT_FOUND", message: "Order not found" };

  const currentStatus = order.status || ORDER_STATUS.PENDING;
  // Statuses this transition may legally start from - re-checked atomically
  // inside the transaction so two concurrent requests can't both pass this
  // check and both restock/revert points (check-then-act race).
  const fromStatuses =
    allowedFrom ||
    Object.entries(ORDER_STATUS_FLOW)
      .filter(([, nexts]) => nexts.includes(status))
      .map(([from]) => from);
  if (!fromStatuses.includes(currentStatus)) {
    return {
      ok: false,
      code: "INVALID_TRANSITION",
      message: `Cannot change order status from "${currentStatus}" to "${status}"`,
    };
  }

  let refundOwed = null;
  let updated;
  try {
    updated = await prisma.$transaction(async (tx) => {
      const claimed = await tx.order.updateMany({
        where: { id: order.id, status: { in: fromStatuses }, deleted_at: null },
        data: { status },
      });
      if (claimed.count === 0) throw new Error("ORDER_STATUS_CONFLICT");

      const fresh = await tx.order.findUniqueOrThrow({
        where: { id: order.id },
        include: { user: { select: { id: true, name: true, email: true } } },
      });
      if (status === ORDER_STATUS.CANCELLED) {
        refundOwed = await cancelInTx(tx, { ...fresh, order_items: order.order_items });
      }
      if (status === ORDER_STATUS.DELIVERED) {
        await onOrderDelivered(tx, { ...fresh, order_items: order.order_items });
      }
      return fresh;
    });
  } catch (err) {
    if (err.message === "ORDER_STATUS_CONFLICT") {
      return {
        ok: false,
        code: "CONFLICT",
        message: "Order status was already changed by another request",
      };
    }
    throw err;
  }

  logRefundOwed(actor, updated, refundOwed);
  writeAuditLog({
    userId: actor.actorUserId ?? null,
    action: auditAction,
    resource: "order",
    resourceId: order.id,
    ip: actor.ip,
    userAgent: actor.userAgent,
    metadata: { status, previous: currentStatus, ...auditMetadata },
  });

  if (notifyBuyer) {
    notifyUser({
      userId: order.user_id,
      title: "Order update",
      message: `Order ${order.order_number || `#${order.id}`} ${
        STATUS_LABEL[status] || `status changed to ${status}`
      }`,
      type: "ORDER",
    });
  }

  return { ok: true, order: updated, previous: currentStatus };
};

export const actorFromReq = (req) => ({
  actorUserId: req.user?.id ?? null,
  ip: req.ip,
  userAgent: req.headers?.["user-agent"],
});
