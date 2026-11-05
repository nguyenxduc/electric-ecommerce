import { prisma } from "../lib/db.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import { parsePagination, buildPaginationMeta } from "../lib/pagination.js";
import { ROLES } from "../constants/roles.js";
import { shopYearSummary, periodReport, isPeriod } from "../services/tax.service.js";

const ID_RE = /^[1-9][0-9]{0,18}$/;
const notFound = (res) =>
  res.status(404).json({ success: false, message: "Invoice not found" });
const badRequest = (res, message) =>
  res.status(400).json({ success: false, message });

// Route buyer khong qua sellerRoute nen tu nap shop cua user de kiem tra quyen chu shop.
const attachShop = async (req) => {
  if (req.shop || req.user.role === ROLES.ADMIN) return;
  req.shop = await prisma.shop.findUnique({
    where: { owner_id: BigInt(req.user.id) },
  });
};

// Nguoi mua cua don, chu shop, hoac admin moi duoc xem hoa don.
const canView = (req, invoice) =>
  req.user.role === ROLES.ADMIN ||
  invoice.order.user_id.toString() === req.user.id ||
  req.shop?.id?.toString() === invoice.shop_id.toString();

export const getInvoiceByOrder = asyncHandler(async (req, res) => {
  if (!ID_RE.test(req.params.orderId)) return notFound(res);
  await attachShop(req);
  const invoice = await prisma.invoice.findUnique({
    where: { order_id: BigInt(req.params.orderId) },
    include: { order: { select: { user_id: true, order_number: true } } },
  });
  if (!invoice || !canView(req, invoice)) return notFound(res);
  res.json({ success: true, data: invoice });
});

const ESC = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
const esc = (v) => String(v ?? "").replace(/[&<>"']/g, (c) => ESC[c]);
const money = (n) => Number(n).toFixed(2);

export const getInvoiceHtml = asyncHandler(async (req, res) => {
  await attachShop(req);
  const inv = await prisma.invoice.findUnique({
    where: { id: BigInt(req.params.id) },
    include: { order: { select: { user_id: true } } },
  });
  if (!inv || !canView(req, inv)) return notFound(res);

  const s = inv.seller || {};
  const b = inv.buyer || {};
  const rows = (inv.items || [])
    .map(
      (i, idx) =>
        `<tr><td>${idx + 1}</td><td>${esc(i.name)}${i.variant ? ` (${esc(i.variant)})` : ""}</td>` +
        `<td class="r">${esc(i.quantity)}</td><td class="r">${money(i.unit_price)}</td><td class="r">${money(i.total)}</td></tr>`,
    )
    .join("");
  const cancelled =
    inv.status === "cancelled" ? `<p class="x">DA HUY / CANCELLED</p>` : "";

  const html = `<!doctype html><html lang="vi"><head><meta charset="utf-8">
<title>Hoa don ${esc(inv.invoice_number)}</title>
<style>body{font-family:Arial,sans-serif;max-width:800px;margin:24px auto;color:#111}
h1{text-align:center;font-size:20px}table{width:100%;border-collapse:collapse;margin:12px 0}
td,th{border:1px solid #999;padding:6px}.r{text-align:right}.x{color:#c00;font-weight:bold;text-align:center}
.t td{border:0}</style></head><body>
<h1>HOA DON GIA TRI GIA TANG</h1>${cancelled}
<p>Ky hieu: <b>${esc(inv.series)}</b> &nbsp; So: <b>${esc(inv.invoice_number)}</b> &nbsp; Ngay: ${esc(inv.issued_at.toISOString().slice(0, 10))}</p>
<p><b>Nguoi ban:</b> ${esc(s.name)}<br>MST: ${esc(s.tax_code)}<br>Dia chi: ${esc(s.address)}</p>
<p><b>Nguoi mua:</b> ${esc(b.company_name || b.name)}<br>${b.tax_code ? `MST: ${esc(b.tax_code)}<br>` : ""}Dia chi: ${esc(b.company_address || b.address)}${b.email ? `<br>Email: ${esc(b.email)}` : ""}</p>
<table><thead><tr><th>STT</th><th>Bang hang</th><th>SL</th><th>Don gia</th><th>Thanh tien</th></tr></thead><tbody>${rows}</tbody></table>
<table class="t"><tr><td class="r">Cong tien hang:</td><td class="r" style="width:140px">${money(inv.subtotal)}</td></tr>
<tr><td class="r">Thue GTGT (${esc((Number(inv.vat_rate) * 100).toFixed(2))}%):</td><td class="r">${money(inv.vat_amount)}</td></tr>
<tr><td class="r"><b>Tong thanh toan:</b></td><td class="r"><b>${money(inv.total)}</b></td></tr></table>
</body></html>`;
  res.type("html").send(html);
});

const listInvoices = async (req, res, where) => {
  const { currentPage, perPage, skip, take } = parsePagination(
    req.query.page,
    req.query.limit,
  );
  const [invoices, total] = await Promise.all([
    prisma.invoice.findMany({ where, orderBy: { issued_at: "desc" }, skip, take }),
    prisma.invoice.count({ where }),
  ]);
  res.json({
    success: true,
    data: { invoices, pagination: buildPaginationMeta(currentPage, perPage, total) },
  });
};

export const getShopInvoices = asyncHandler(async (req, res) => {
  if (!req.shop) return badRequest(res, "Seller shop required");
  return listInvoices(req, res, { shop_id: req.shop.id });
});

export const getAllInvoices = asyncHandler(async (req, res) => {
  const { shop_id, status, from, to } = req.query;
  const where = {};
  if (shop_id) {
    if (!ID_RE.test(String(shop_id))) return badRequest(res, "Invalid shop_id");
    where.shop_id = BigInt(shop_id);
  }
  if (status) where.status = String(status);
  const issued = {};
  if (from && !isNaN(new Date(from))) issued.gte = new Date(from);
  if (to && !isNaN(new Date(to))) issued.lte = new Date(to);
  if (Object.keys(issued).length) where.issued_at = issued;
  return listInvoices(req, res, where);
});

export const getShopTaxSummary = asyncHandler(async (req, res) => {
  if (!req.shop) return badRequest(res, "Seller shop required");
  const year = Number(req.query.year) || new Date().getFullYear();
  const months = await shopYearSummary(req.shop.id, year);
  res.json({ success: true, data: { year, months } });
});

export const getTaxReport = asyncHandler(async (req, res) => {
  if (!isPeriod(req.query.period)) return badRequest(res, "period must be YYYY-MM");
  const rows = await periodReport(req.query.period);
  res.json({ success: true, data: { period: req.query.period, rows } });
});

// Chong CSV injection: o bat dau bang = + - @ (hoac tab/CR) bi Excel coi la cong thuc.
const csvCell = (v) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const getTaxReportCsv = asyncHandler(async (req, res) => {
  if (!isPeriod(req.query.period)) return badRequest(res, "period must be YYYY-MM");
  const rows = await periodReport(req.query.period);
  const lines = ["shop_name,tax_code,entity_type,orders,base,vat,pit"].concat(
    rows.map((r) =>
      [r.shop_name, r.tax_code, r.entity_type, r.orders, r.base, r.vat, r.pit]
        .map(csvCell)
        .join(","),
    ),
  );
  res
    .type("text/csv")
    .set("Content-Disposition", `attachment; filename="tax-${req.query.period}.csv"`)
    .send(lines.join("\r\n"));
});
