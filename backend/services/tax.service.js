import { prisma } from "../lib/db.js";
import { round2 } from "./pricing.service.js";

export const isPeriod = (p) => /^\d{4}-(0[1-9]|1[0-2])$/.test(String(p || ""));

// Cong tung dong roi round2 o cuoi de tranh troi so thap phan.
const sumRows = (rows) => {
  let base = 0;
  let vat = 0;
  let pit = 0;
  for (const r of rows) {
    base += Number(r.base_amount);
    vat += Number(r.vat_amount);
    pit += Number(r.pit_amount);
  }
  return { orders: rows.length, base: round2(base), vat: round2(vat), pit: round2(pit) };
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

/** Tong ket thue khau tru theo thang cua mot shop trong nam (bo qua dong da dao). */
export const shopYearSummary = async (shopId, year) => {
  const rows = await prisma.taxWithholding.findMany({
    where: { shop_id: shopId, reversed_at: null, period: { startsWith: `${year}-` } },
    orderBy: { period: "asc" },
  });
  return [...groupBy(rows, (r) => r.period)].map(([period, list]) => {
    const s = sumRows(list);
    return { period, ...s, total_withheld: round2(s.vat + s.pit) };
  });
};

/** Bao cao theo shop cho mot ky (admin). */
export const periodReport = async (period) => {
  const rows = await prisma.taxWithholding.findMany({
    where: { period, reversed_at: null },
    include: { shop: { select: { id: true, name: true, tax_code: true, tax_entity_type: true } } },
    orderBy: { shop_id: "asc" },
  });
  return [...groupBy(rows, (r) => r.shop_id.toString()).values()].map((list) => {
    const { shop } = list[0];
    return {
      shop_id: shop.id,
      shop_name: shop.name,
      tax_code: shop.tax_code,
      entity_type: shop.tax_entity_type,
      ...sumRows(list),
    };
  });
};
