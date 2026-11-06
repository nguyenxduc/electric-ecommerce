import { prisma } from "../lib/db.js";
import { round2 } from "./pricing.service.js";
import { vnPeriod } from "./invoice.service.js";

export const isPeriod = (p) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(p || ""));

// Dong tinh vao ky goc cua no (+); dong da dao tinh them mot ban am o ky cua reversed_at (VN),
// de thang da nop khong bi viet lai.
const toEntries = (rows, inPeriod) =>
  rows.flatMap((r) => {
    const out = [];
    if (inPeriod(r.period)) out.push({ r, sign: 1, period: r.period });
    const rp = r.reversed_at && vnPeriod(r.reversed_at);
    if (rp && inPeriod(rp)) out.push({ r, sign: -1, period: rp });
    return out;
  });

// Cong tung dong roi round2 o cuoi de tranh troi so thap phan.
const sumRows = (entries) => {
  let base = 0;
  let vat = 0;
  let pit = 0;
  let orders = 0;
  for (const { r, sign } of entries) {
    base += sign * Number(r.base_amount);
    vat += sign * Number(r.vat_amount);
    pit += sign * Number(r.pit_amount);
    orders += sign;
  }
  return { orders, base: round2(base), vat: round2(vat), pit: round2(pit) };
};

const groupBy = (rows, keyFn) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};

// Moc dau thang/nam theo gio VN de loc reversed_at.
const vnStart = (y, m) => new Date(`${y}-${String(m).padStart(2, "0")}-01T00:00:00+07:00`);

/** Tong ket thue khau tru theo thang cua mot shop trong nam (dong dao tinh am o ky dao). */
export const shopYearSummary = async (shopId, year) => {
  const rows = await prisma.taxWithholding.findMany({
    where: {
      shop_id: shopId,
      OR: [
        { period: { startsWith: `${year}-` } },
        { reversed_at: { gte: vnStart(year, 1), lt: vnStart(Number(year) + 1, 1) } },
      ],
    },
  });
  const entries = toEntries(rows, (p) => p.startsWith(`${year}-`));
  return [...groupBy(entries, (e) => e.period)]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([period, list]) => {
      const s = sumRows(list);
      return { period, ...s, total_withheld: round2(s.vat + s.pit) };
    });
};

/** Bao cao theo shop cho mot ky (admin). Dong dao tinh am o ky cua reversed_at. */
export const periodReport = async (period) => {
  const [y, m] = period.split("-").map(Number);
  const rows = await prisma.taxWithholding.findMany({
    where: {
      OR: [
        { period },
        { reversed_at: { gte: vnStart(y, m), lt: m === 12 ? vnStart(y + 1, 1) : vnStart(y, m + 1) } },
      ],
    },
    include: { shop: { select: { id: true, name: true, tax_code: true, tax_entity_type: true } } },
    orderBy: { shop_id: "asc" },
  });
  const entries = toEntries(rows, (p) => p === period);
  return [...groupBy(entries, (e) => e.r.shop_id.toString()).values()].map((list) => {
    const { shop } = list[0].r;
    return {
      shop_id: shop.id,
      shop_name: shop.name,
      tax_code: shop.tax_code,
      entity_type: shop.tax_entity_type,
      ...sumRows(list),
    };
  });
};
