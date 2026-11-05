// Huy don thanh toan online (momo/vnpay) qua han chua tra tien de tra kho.
// Huy qua transitionOrderStatus nen restock/diem/payment dung chung quy tac.
import "dotenv/config";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/db.js";
import { getSettingNumber } from "../lib/settings.js";
import { PAYMENT_STATUS, ORDER_STATUS } from "../constants/status.js";
import { transitionOrderStatus } from "../services/orderLifecycle.service.js";
import { runWithJobLock, runJobScript } from "./lib/jobLock.js";

const LOCK_ID = 782_026_011;
const NAME = "expire-unpaid-orders";

// Chi lay don pending, online, cu hon timeout, va checkout chua co payment paid.
export const selectExpiredUnpaidOrders = async (now = new Date()) => {
  const minutes = await getSettingNumber("order_payment_timeout_minutes", 30);
  const cutoff = new Date(now.getTime() - minutes * 60 * 1000);
  return prisma.order.findMany({
    where: {
      status: ORDER_STATUS.PENDING,
      deleted_at: null,
      payment_method: { in: ["momo", "vnpay"] },
      created_at: { lt: cutoff },
      order_group: { payments: { none: { status: PAYMENT_STATUS.PAID } } },
    },
    select: { id: true },
    orderBy: { id: "asc" },
    take: 500,
  });
};

export const expireUnpaidOrders = async () => {
  const orders = await selectExpiredUnpaidOrders();
  let cancelled = 0;
  for (const { id } of orders) {
    // Chay song song/da bi huy: transition tu kiem tra lai trong tx nen an toan.
    const r = await transitionOrderStatus({
      orderId: id,
      status: ORDER_STATUS.CANCELLED,
      allowedFrom: [ORDER_STATUS.PENDING],
      actor: { actorUserId: null },
      auditAction: "ORDER_PAYMENT_TIMEOUT",
    });
    if (r.ok) cancelled++;
  }
  return cancelled;
};

const main = () =>
  runWithJobLock(LOCK_ID, NAME, async () => {
    const n = await expireUnpaidOrders();
    console.log(`[${NAME}] cancelled ${n} order(s)`);
  });

if (process.argv[1] === fileURLToPath(import.meta.url)) runJobScript(NAME, main);
