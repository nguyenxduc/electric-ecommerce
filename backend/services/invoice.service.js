// Hoa don dien tu + khau tru thue cho don giao thanh cong.
import { getSettingNumber } from "../lib/settings.js";
import { prisma } from "../lib/db.js";
import { round2 } from "./pricing.service.js";

// Nha cung cap hoa don. Chi co 'internal' (danh so noi bo, khong co gia tri
// phap ly tuong duong hoa don dien tu da dang ky). VNPT/Viettel/MISA can hop
// dong + thong tin API that, xem D1 trong .omc/autopilot/decisions-pending.md.
// Provider moi: { issue(invoiceData) -> { provider_ref } }.
export const INVOICE_PROVIDERS = {
  internal: { issue: async () => ({ provider_ref: null }) },
};

const getSettingString = async (key, fallback) => {
  const s = await prisma.setting.findFirst({ where: { key, deleted_at: null } });
  return s?.value?.trim() || fallback;
};

// Thang thue theo gio VN, tranh lech thang khi server chay UTC.
const vnPeriod = (d) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Ho_Chi_Minh",
    year: "numeric",
    month: "2-digit",
  })
    .format(d)
    .slice(0, 7);

/** Goi trong giao dich khi don con chuyen sang delivered. Idempotent. */
export const onOrderDelivered = async (tx, order) => {
  if (await tx.invoice.findUnique({ where: { order_id: order.id } })) return;

  const [vatRate, wVat, wPit, seriesSetting] = await Promise.all([
    getSettingNumber("invoice_vat_rate", 0.1),
    getSettingNumber("tax_withhold_vat_rate", 0.01),
    getSettingNumber("tax_withhold_pit_rate", 0.005),
    getSettingString("invoice_series", ""),
  ]);

  const full = await tx.order.findUniqueOrThrow({
    where: { id: order.id },
    include: {
      shop: true,
      order_group: { select: { invoice_request: true } },
      order_items: {
        include: { product: { select: { name: true } }, variant: true },
      },
    },
  });
  const { shop } = full;
  const now = new Date();

  const series =
    seriesSetting || `C${String(now.getFullYear()).slice(-2)}TNG`;
  const [{ nextval }] = await tx.$queryRaw`SELECT nextval('invoice_number_seq')`;
  const invoice_number = `${series}-${String(nextval).padStart(8, "0")}`;

  const items = full.order_items.map((i) => ({
    name: i.product?.name || `#${i.product_id}`,
    variant: i.variant?.name || i.color || null,
    quantity: i.quantity,
    unit_price: Number(i.unit_price),
    total: Number(i.total_price),
  }));
  const shipping = Number(full.shipping_fee);
  if (shipping > 0) {
    items.push({
      name: "Phi van chuyen",
      variant: null,
      quantity: 1,
      unit_price: shipping,
      total: shipping,
    });
  }

  // Gia da gom VAT: tach VAT ra, subtotal + vat == total tuyet doi.
  const total = Number(full.total_amount);
  const subtotal = round2(total / (1 + vatRate));
  const req = full.order_group?.invoice_request || {};
  const addr = full.shipping_address?.address;

  await tx.invoice.create({
    data: {
      order_id: full.id,
      shop_id: full.shop_id,
      invoice_number,
      series,
      provider: "internal",
      seller: {
        name: shop.name,
        tax_code: shop.tax_code,
        address: shop.pickup_address || shop.address,
        entity_type: shop.tax_entity_type,
      },
      buyer: {
        name: full.receiver_name,
        phone: full.receiver_phone,
        address: addr || null,
        company_name: req.company_name || null,
        tax_code: req.tax_code || null,
        company_address: req.address || null,
        email: req.email || null,
      },
      items,
      subtotal,
      vat_rate: vatRate,
      vat_amount: round2(total - subtotal),
      total,
      issued_at: now,
    },
  });

  if (shop.tax_entity_type === "household") {
    const base = round2(total - shipping);
    await tx.taxWithholding.create({
      data: {
        order_id: full.id,
        shop_id: full.shop_id,
        period: vnPeriod(now),
        base_amount: base,
        vat_rate: wVat,
        vat_amount: round2(base * wVat),
        pit_rate: wPit,
        pit_amount: round2(base * wPit),
      },
    });
  }
};

/** Goi trong giao dich khi don con chuyen sang returned. */
export const onOrderReturned = async (tx, order) => {
  const now = new Date();
  // Giu dong cu de doi soat, chi danh dau huy/dao
  await tx.invoice.updateMany({
    where: { order_id: order.id, status: "issued" },
    data: { status: "cancelled", cancelled_at: now },
  });
  await tx.taxWithholding.updateMany({
    where: { order_id: order.id, reversed_at: null },
    data: { reversed_at: now },
  });
};
