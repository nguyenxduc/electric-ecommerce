import crypto from "node:crypto";
import { prisma } from "../lib/db.js";
import { ROLES } from "../constants/roles.js";
import { asyncHandler, AppError } from "../middleware/error.middleware.js";
import { writeAuditLog } from "../services/audit.service.js";
import { actorFromReq } from "../services/orderLifecycle.service.js";
import { groupItemsByShop, round2 } from "../services/pricing.service.js";
import { getSettingNumber } from "../lib/settings.js";
import { quoteShippingForGroups } from "../services/shipping/index.js";
import { getProvider } from "../services/shipping/providers/index.js";
import { mockMapStatus } from "../services/shipping/providers/mock.js";
import {
  applyShipmentStatus,
  cancelShipmentById,
  createShipmentForOrder,
} from "../services/shipping/shipment.service.js";

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]);
const bad = (msg, code = 400) => new AppError(msg, code);

// --- Bao gia -----------------------------------------------------------------

// POST /api/shipping/quote - cung ham voi checkout nen so lieu khop
export const quote = asyncHandler(async (req, res) => {
  const { items, shipping_address } = req.body || {};
  if (!Array.isArray(items) || items.length === 0 || items.length > 100) {
    throw bad("items must be a non-empty array");
  }
  const prepared = [];
  for (const it of items) {
    const qty = Number(it?.quantity);
    if (!it?.product_id || !Number.isInteger(qty) || qty < 1 || !/^\d{1,18}$/.test(String(it.product_id))) {
      throw bad("Each item needs product_id and integer quantity >= 1");
    }
    const product = await prisma.product.findFirst({
      where: { id: BigInt(it.product_id), deleted_at: null },
      include: { shop: true, variants: { where: { deleted_at: null }, select: { id: true, price_delta: true } } },
    });
    if (!product) throw bad(`Product ${it.product_id} not found`);
    // Giong checkout: san pham co bien the thi bat buoc chon bien the cua chinh san pham do
    let variant = null;
    if (product.variants.length > 0) {
      variant = product.variants.find((v) => it.variant_id != null && v.id.toString() === String(it.variant_id));
      if (!variant) throw bad(`Valid variant required for product ${it.product_id}`);
    }
    prepared.push({
      shop: product.shop,
      weightGrams: (product.weight_grams || 0) * qty,
      data: { total_price: round2((Number(product.price) - Number(product.discount || 0) + Number(variant?.price_delta || 0)) * qty) },
    });
  }
  const groups = groupItemsByShop(prepared);
  for (const g of groups.values()) {
    g.weightGrams = g.items.reduce((s, i) => s + i.weightGrams, 0);
  }
  let address = shipping_address;
  if (typeof address === "string") {
    try {
      address = JSON.parse(address);
    } catch {
      // chuoi thuong: khong co tinh/huyen nen se dung phi co dinh
    }
  }
  const [platformShippingFee, platformFreeThreshold] = await Promise.all([
    getSettingNumber("shipping_fee", 9.99),
    getSettingNumber("free_shipping_threshold", 199),
  ]);
  const total = await quoteShippingForGroups(groups, { address, platformShippingFee, platformFreeThreshold });
  res.json({
    success: true,
    data: {
      shops: [...groups.values()].map((g) => ({
        shop_id: g.shopId,
        shop_name: g.shopName,
        subtotal: round2(g.subtotal),
        weight_grams: g.weightGrams,
        shipping: g.shipping,
      })),
      total: round2(total),
    },
  });
});

// --- Van don cua seller ------------------------------------------------------

const loadOrder = (id) =>
  prisma.order.findFirst({
    where: { id: BigInt(id), deleted_at: null },
    include: { shop: true, order_items: { include: { product: true } } },
  });

// Middleware requireShopOwnership: shop cua don (orderId) / cua van don (id)
export const shopIdOfOrder = async (req) =>
  (await prisma.order.findFirst({ where: { id: BigInt(req.params.orderId) }, select: { shop_id: true } }))?.shop_id;
export const shopIdOfShipment = async (req) =>
  (
    await prisma.shipment.findUnique({
      where: { id: BigInt(req.params.id) },
      select: { order: { select: { shop_id: true } } },
    })
  )?.order.shop_id;

// POST /api/shipments/orders/:orderId
export const createShipment = asyncHandler(async (req, res) => {
  const order = await loadOrder(req.params.orderId);
  if (!order) throw bad("Order not found", 404);
  const shipment = await createShipmentForOrder(order, order.shop, actorFromReq(req));
  writeAuditLog({
    userId: req.user.id,
    action: "SHIPMENT_CREATE",
    resource: "shipment",
    resourceId: shipment.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { order_id: order.id.toString(), carrier: shipment.carrier },
  });
  res.status(201).json({ success: true, data: shipment });
});

// DELETE /api/shipments/:id
export const cancelShipment = asyncHandler(async (req, res) => {
  const shipment = await prisma.shipment.findUnique({ where: { id: BigInt(req.params.id) } });
  if (!shipment) throw bad("Shipment not found", 404);
  const r = await cancelShipmentById(shipment);
  writeAuditLog({
    userId: req.user.id,
    action: "SHIPMENT_CANCEL",
    resource: "shipment",
    resourceId: shipment.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json({ success: true, data: r.shipment });
});

// GET /api/shipments/orders/:orderId - nguoi mua, shop cua don, admin
export const getShipmentByOrder = asyncHandler(async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: BigInt(req.params.orderId), deleted_at: null },
    include: { shop: { select: { owner_id: true } } },
  });
  if (!order) throw bad("Order not found", 404);
  const uid = req.user.id.toString();
  const allowed =
    req.user.role === ROLES.ADMIN || order.user_id.toString() === uid || order.shop.owner_id.toString() === uid;
  if (!allowed) throw bad("Not authorized", 403);
  const shipment = await prisma.shipment.findUnique({
    where: { order_id: order.id },
    include: { events: { orderBy: { occurred_at: "asc" } } },
  });
  res.json({ success: true, data: shipment });
});

// GET /api/shipments/:id/label - HTML in duoc cho moi nha van chuyen
export const getLabel = asyncHandler(async (req, res) => {
  const shipment = await prisma.shipment.findUnique({
    where: { id: BigInt(req.params.id) },
    include: { order: { include: { shop: true, order_items: { include: { product: true } } } } },
  });
  if (!shipment) throw bad("Shipment not found", 404);
  const { order } = shipment;
  const addr = order.shipping_address && typeof order.shipping_address === "object" ? order.shipping_address : {};
  let carrierUrl = shipment.label_url;
  if (!carrierUrl) {
    try {
      carrierUrl = await getProvider(shipment.carrier)?.getLabelUrl(shipment);
    } catch (err) {
      console.warn("[shipping] getLabelUrl failed:", err.message);
    }
  }
  const place = [addr.address, addr.ward, addr.district, addr.province].filter(Boolean).join(", ");
  const pickup = [order.shop.pickup_address, order.shop.pickup_ward, order.shop.pickup_district, order.shop.pickup_province]
    .filter(Boolean)
    .join(", ");
  const rows = order.order_items
    .map((i) => `<li>${esc(i.product.name)} x ${esc(i.quantity)}</li>`)
    .join("");
  res.type("html").send(`<!doctype html>
<html><head><meta charset="utf-8"><title>Shipping label ${esc(shipment.tracking_code)}</title>
<style>body{font-family:sans-serif;max-width:480px;margin:16px auto;border:2px solid #000;padding:16px}
.code{font-size:32px;font-weight:700;letter-spacing:2px;text-align:center;margin:12px 0}
.cod{font-size:22px;font-weight:700}h4{margin:12px 0 4px}</style></head><body>
<div>Carrier: <b>${esc(shipment.carrier.toUpperCase())}</b></div>
<div class="code">${esc(shipment.tracking_code)}</div>
<h4>From</h4><div>${esc(order.shop.name)}<br>${esc(order.shop.contact_phone)}<br>${esc(pickup)}</div>
<h4>To</h4><div>${esc(order.receiver_name || addr.name)} - ${esc(order.receiver_phone || addr.phone)}<br>${esc(place)}</div>
<h4>COD</h4><div class="cod">${shipment.cod_amount_vnd > 0 ? `${shipment.cod_amount_vnd.toLocaleString("en-US")} VND` : "No COD (prepaid)"}</div>
<h4>Items (${esc(shipment.weight_grams)} g)</h4><ul>${rows}</ul>
${carrierUrl ? `<p><a href="${esc(carrierUrl)}">Carrier label</a></p>` : ""}
</body></html>`);
});

// --- Webhook + mo phong ------------------------------------------------------

const sha = (s) => crypto.createHash("sha256").update(String(s)).digest();

// POST /api/shipments/webhook/:carrier (token o header x-webhook-token hoac ?token=)
export const webhook = asyncHandler(async (req, res) => {
  const carrierKey = String(req.params.carrier).toUpperCase().replace(/[^A-Z0-9]/g, "_");
  const secret = process.env[`SHIPPING_WEBHOOK_SECRET_${carrierKey}`] || process.env.SHIPPING_WEBHOOK_SECRET;
  const token = req.headers["x-webhook-token"] || req.query.token;
  // Hash truoc de timingSafeEqual nhan hai buffer cung do dai
  if (!secret || !token || !crypto.timingSafeEqual(sha(secret), sha(token))) {
    return res.status(401).json({ success: false, error: "Invalid webhook token" });
  }
  // Carrier mock chi de dev/test: o production khong ai duoc gia lap su kien giao hang qua webhook
  if (process.env.NODE_ENV === "production" && req.params.carrier === "mock") {
    throw bad("Unknown carrier", 404);
  }
  const provider = getProvider(req.params.carrier);
  if (!provider) throw bad("Unknown carrier", 404);
  const evt = provider.parseWebhook(req.body);
  const shipment = evt.trackingCode
    ? await prisma.shipment.findFirst({ where: { carrier: provider.name, tracking_code: String(evt.trackingCode) } })
    : null;
  // 200 de nha van chuyen khong gui lai mai mai cac su kien ta khong dung toi
  if (!shipment || !evt.status) return res.json({ success: true, ignored: true });
  const r = await applyShipmentStatus(shipment.id, evt);
  res.json({ success: true, changed: r.changed });
});

const SIM_STATUSES = ["picking", "in_transit", "delivered", "returned", "cancelled", "failed"];

// POST /api/shipments/:id/simulate {status} - chi van don mock
export const simulate = asyncHandler(async (req, res) => {
  if (req.user.role !== ROLES.ADMIN && process.env.SHIPMENT_SIMULATE_ENABLED !== "1") {
    throw bad("Simulation is disabled", 403);
  }
  const shipment = await prisma.shipment.findUnique({ where: { id: BigInt(req.params.id) } });
  if (!shipment) throw bad("Shipment not found", 404);
  if (shipment.carrier !== "mock") throw bad("Only mock shipments can be simulated");
  const status = mockMapStatus(req.body?.status);
  if (!SIM_STATUSES.includes(status)) throw bad(`status must be one of picked, ${SIM_STATUSES.join(", ")}`);
  const r = await applyShipmentStatus(shipment.id, { status, description: "Simulated" });
  res.json({ success: true, changed: r.changed, data: r.shipment });
});

// --- Doi soat COD (admin) ----------------------------------------------------

const pendingWhere = (carrier) => ({
  cod_collected_at: { not: null },
  cod_settlement_id: null,
  cod_amount_vnd: { gt: 0 },
  ...(carrier && { carrier: String(carrier) }),
});

// GET /api/shipments/cod/pending?carrier=
export const codPending = asyncHandler(async (req, res) => {
  const shipments = await prisma.shipment.findMany({
    where: pendingWhere(req.query.carrier),
    orderBy: { cod_collected_at: "asc" },
    take: 500,
    include: { order: { select: { id: true, order_number: true, shop_id: true } } },
  });
  res.json({
    success: true,
    data: {
      shipments,
      count: shipments.length,
      total_cod_vnd: shipments.reduce((s, x) => s + x.cod_amount_vnd, 0),
    },
  });
});

// POST /api/shipments/cod/settlements
export const createSettlement = asyncHandler(async (req, res) => {
  const { carrier, shipment_ids, received_amount_vnd, reference, note } = req.body || {};
  const received = Number(received_amount_vnd);
  if (!carrier || !getProvider(carrier)) throw bad("carrier is invalid");
  if (!Number.isInteger(received) || received < 0) throw bad("received_amount_vnd must be a non-negative integer");
  if (!Array.isArray(shipment_ids) || shipment_ids.length === 0 || !shipment_ids.every((i) => /^\d{1,18}$/.test(String(i)))) {
    throw bad("shipment_ids must be a non-empty array of ids");
  }
  const ids = [...new Set(shipment_ids.map((i) => BigInt(i)))];

  const settlement = await prisma.$transaction(async (tx) => {
    const rows = await tx.shipment.findMany({ where: { id: { in: ids } } });
    if (rows.length !== ids.length) throw bad("Some shipments were not found", 404);
    if (rows.some((s) => s.carrier !== carrier)) throw bad("All shipments must belong to the same carrier");
    if (rows.some((s) => !s.cod_collected_at || s.cod_settlement_id)) {
      throw bad("Shipments must be COD-collected and not yet settled", 409);
    }
    const expected = rows.reduce((s, x) => s + x.cod_amount_vnd, 0);
    const created = await tx.codSettlement.create({
      data: {
        carrier,
        reference: reference ? String(reference).slice(0, 100) : null,
        expected_amount_vnd: expected,
        received_amount_vnd: received,
        difference_vnd: received - expected,
        note: note ? String(note).slice(0, 500) : null,
        created_by: BigInt(req.user.id),
      },
    });
    // Dieu kien cod_settlement_id null chan hai admin doi soat cung mot van don
    const linked = await tx.shipment.updateMany({
      where: { id: { in: ids }, cod_settlement_id: null },
      data: { cod_settlement_id: created.id },
    });
    if (linked.count !== ids.length) throw bad("Shipments were settled concurrently", 409);
    return created;
  });

  writeAuditLog({
    userId: req.user.id,
    action: "COD_SETTLEMENT",
    resource: "cod_settlement",
    resourceId: settlement.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: {
      carrier,
      shipments: ids.length,
      expected_vnd: settlement.expected_amount_vnd,
      received_vnd: received,
      difference_vnd: settlement.difference_vnd,
    },
  });
  res.status(201).json({ success: true, data: settlement });
});

// GET /api/shipments/cod/settlements
export const listSettlements = asyncHandler(async (req, res) => {
  const take = Math.min(100, Math.max(1, Number(req.query.limit) || 50));
  const data = await prisma.codSettlement.findMany({
    where: req.query.carrier ? { carrier: String(req.query.carrier) } : {},
    orderBy: { created_at: "desc" },
    take,
    include: { _count: { select: { shipments: true } } },
  });
  res.json({ success: true, data });
});
