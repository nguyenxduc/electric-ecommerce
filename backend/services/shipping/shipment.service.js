// Van don: tao, huy, va xu ly trang thai tu webhook/job/simulate.
// Controller, webhook va job dong bo cung di qua applyShipmentStatus de quy tac chi nam o mot cho.
import { prisma } from "../../lib/db.js";
import { AppError } from "../../middleware/error.middleware.js";
import { ORDER_STATUS } from "../../constants/status.js";
import { transitionOrderStatus } from "../orderLifecycle.service.js";
import { getProvider } from "./providers/index.js";
import { getActiveProvider, toParts, usdToVnd } from "./index.js";

export const FINAL_SHIPMENT_STATUSES = ["delivered", "returned", "cancelled"];

export const createShipmentForOrder = async (order, shop, actor = {}) => {
  const existing = await prisma.shipment.findUnique({ where: { order_id: order.id } });
  // Van don da huy thi cho tao lai (order_id unique nen phai xoa ban cu)
  if (existing && existing.status !== "cancelled") {
    throw new AppError("Order already has a shipment", 409);
  }
  if (![ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING].includes(order.status)) {
    throw new AppError(`Cannot ship an order in status "${order.status}"`, 400);
  }

  const items = order.order_items.map((i) => ({
    name: i.product.name,
    quantity: i.quantity || 1,
    weight: (i.product.weight_grams || 0) * (i.quantity || 1),
  }));
  const weightGrams = Math.max(1, items.reduce((s, i) => s + i.weight, 0));
  const addr = order.shipping_address;
  const receiver = {
    name: order.receiver_name || addr?.name,
    phone: order.receiver_phone || addr?.phone,
  };
  const from = {
    province: shop.pickup_province,
    district: shop.pickup_district,
    ward: shop.pickup_ward,
    address: shop.pickup_address,
  };
  const codVnd = order.payment_method === "cod" ? usdToVnd(order.total_amount) : 0;
  const provider = await getActiveProvider();

  // Goi nha van chuyen truoc khi ghi DB: that bai thi khong de lai ban ghi nua chung
  const created = await provider.createShipment({
    order,
    shop,
    from,
    to: toParts(addr),
    receiver,
    weightGrams,
    codVnd,
    items,
  });

  const shipment = await prisma.$transaction(async (tx) => {
    if (existing) await tx.shipment.delete({ where: { id: existing.id } });
    return tx.shipment.create({
      data: {
        order_id: order.id,
        carrier: provider.name,
        tracking_code: created.trackingCode,
        fee_vnd: created.feeVnd,
        cod_amount_vnd: codVnd,
        weight_grams: weightGrams,
        label_url: created.labelUrl,
        raw: created.raw ?? {},
        events: { create: { status: "created", description: "Shipment created" } },
      },
      include: { events: true },
    });
  });

  if (order.status === ORDER_STATUS.PENDING) {
    await transitionOrderStatus({
      orderId: order.id,
      status: ORDER_STATUS.PROCESSING,
      actor,
    });
  }
  return shipment;
};

export const cancelShipmentById = async (shipment) => {
  if (!["created", "picking"].includes(shipment.status)) {
    throw new AppError("Shipment can no longer be cancelled", 409);
  }
  // Dung provider luu tren van don, khong phai provider dang bat
  const owner = getProvider(shipment.carrier) || (await getActiveProvider());
  await owner.cancelShipment(shipment);
  return applyShipmentStatus(shipment.id, { status: "cancelled", description: "Cancelled by seller" });
};

/**
 * Ap dung trang thai moi cho van don (idempotent). Tra {changed, shipment}.
 * Cap nhat co dieu kien theo trang thai cu nen webhook den trung/dong thoi chi co mot cai thang.
 */
export const applyShipmentStatus = async (shipmentId, { status, description, raw, occurredAt }) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: BigInt(shipmentId) } });
  if (!shipment) throw new AppError("Shipment not found", 404);
  if (!status || shipment.status === status || FINAL_SHIPMENT_STATUSES.includes(shipment.status)) {
    return { changed: false, shipment };
  }

  const claimed = await prisma.$transaction(async (tx) => {
    const hit = await tx.shipment.updateMany({
      where: { id: shipment.id, status: shipment.status },
      data: {
        status,
        ...(status === "delivered" && shipment.cod_amount_vnd > 0 && !shipment.cod_collected_at
          ? { cod_collected_at: new Date() }
          : {}),
      },
    });
    if (hit.count === 0) return false;
    await tx.shipmentEvent.create({
      data: {
        shipment_id: shipment.id,
        status,
        description: description ? String(description).slice(0, 255) : null,
        raw: raw ?? {},
        ...(occurredAt && { occurred_at: occurredAt }),
      },
    });
    return true;
  });
  if (!claimed) return { changed: false, shipment };

  const actor = { actorUserId: null };
  const order = await prisma.order.findUnique({ where: { id: shipment.order_id } });
  let target = null;
  if (status === "in_transit" && [ORDER_STATUS.PENDING, ORDER_STATUS.PROCESSING].includes(order?.status)) {
    target = ORDER_STATUS.SHIPPED;
  } else if (status === "delivered") {
    target = ORDER_STATUS.DELIVERED;
  } else if (["returned", "cancelled"].includes(status) && order?.status === ORDER_STATUS.SHIPPED) {
    // Chi huy don khi hang da roi tay shop; huy truoc khi lay hang thi shop con dat lai van don
    target = ORDER_STATUS.CANCELLED;
  }
  if (target) {
    const r = await transitionOrderStatus({
      orderId: shipment.order_id,
      status: target,
      actor,
      auditAction: "SHIPMENT_WEBHOOK",
      auditMetadata: { shipment_id: shipment.id.toString(), carrier_status: status },
    });
    if (!r.ok) console.warn(`[shipping] order ${shipment.order_id} -> ${target} bo qua: ${r.code}`);
  }
  return { changed: true, shipment: await prisma.shipment.findUnique({ where: { id: shipment.id } }) };
};
