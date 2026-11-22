import { prisma } from "../lib/db.js";
import { SHOP_STATUS } from "../constants/status.js";
import { writeAuditLog } from "./audit.service.js";
import { notifyUser } from "../lib/notify.js";
import { takedownProductById } from "./productModeration.service.js";

export const REPORT_REASONS = ["counterfeit", "prohibited", "misleading", "offensive", "other"];
export const REPORT_STATUS = { OPEN: "open", RESOLVED: "resolved", DISMISSED: "dismissed" };
export const MAX_DETAIL = 500;

// Loi nghiep vu co status de controller map ra HTTP (service khong biet res)
export class ProductReportError extends Error {
  constructor(status, message, code) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export const createReport = async (userId, productId, { reason, detail }) => {
  if (!REPORT_REASONS.includes(reason)) {
    throw new ProductReportError(400, `reason must be one of: ${REPORT_REASONS.join(", ")}`);
  }
  if (detail != null && typeof detail !== "string") {
    throw new ProductReportError(400, "detail must be a string");
  }
  const text = (detail ?? "").trim();
  if (text.length > MAX_DETAIL) {
    throw new ProductReportError(400, `detail must be at most ${MAX_DETAIL} characters`);
  }
  if (reason === "other" && !text) {
    throw new ProductReportError(400, "detail is required when reason is other");
  }
  // Chi bao cao duoc san pham nguoi mua dang thay
  const product = await prisma.product.findFirst({
    where: {
      id: productId,
      deleted_at: null,
      is_active: true,
      shop: { status: SHOP_STATUS.ACTIVE, deleted_at: null },
    },
    select: { shop: { select: { owner_id: true } } },
  });
  if (!product) throw new ProductReportError(404, "Product not found");
  if (product.shop.owner_id === userId) {
    throw new ProductReportError(400, "You cannot report your own product");
  }
  try {
    const report = await prisma.productReport.create({
      data: { product_id: productId, reporter_id: userId, reason, detail: text || null },
      select: { id: true, reason: true, status: true },
    });
    return report;
  } catch (err) {
    if (err.code === "P2002") {
      // Bao cao cu da duoc admin xu ly (resolved/dismissed): mo lai voi ly do moi.
      // updateMany co dieu kien status de hai request cung luc chi mo lai mot lan.
      const reopened = await prisma.productReport.updateMany({
        where: { product_id: productId, reporter_id: userId, status: { not: REPORT_STATUS.OPEN } },
        data: {
          reason,
          detail: text || null,
          status: REPORT_STATUS.OPEN,
          resolved_by: null,
          resolved_at: null,
          created_at: new Date(),
        },
      });
      if (reopened.count === 1) {
        return prisma.productReport.findUnique({
          where: { product_id_reporter_id: { product_id: productId, reporter_id: userId } },
          select: { id: true, reason: true, status: true },
        });
      }
      throw new ProductReportError(409, "You already reported this product", "ALREADY_REPORTED");
    }
    throw err;
  }
};

// Gom bao cao theo san pham: dem, ly do, chi tiet moi nhat. Phan trang theo san pham.
export const listReportGroups = async (status, { skip, take }) => {
  const where = { status };
  const [groups, all] = await Promise.all([
    prisma.productReport.groupBy({
      by: ["product_id"],
      where,
      _count: { _all: true },
      _max: { created_at: true },
      orderBy: { _max: { created_at: "desc" } },
      skip,
      take,
    }),
    prisma.productReport.groupBy({ by: ["product_id"], where }),
  ]);
  const ids = groups.map((g) => g.product_id);
  const [products, reports] = await Promise.all([
    prisma.product.findMany({
      where: { id: { in: ids } },
      select: {
        id: true,
        name: true,
        taken_down_at: true,
        takedown_reason: true,
        shop: { select: { name: true, slug: true } },
      },
    }),
    prisma.productReport.findMany({
      where: { ...where, product_id: { in: ids } },
      orderBy: { created_at: "desc" },
      select: { product_id: true, reason: true, detail: true },
    }),
  ]);
  const productById = new Map(products.map((p) => [p.id, p]));
  const items = groups.map((g) => {
    const rows = reports.filter((r) => r.product_id === g.product_id);
    const reasons = {};
    for (const r of rows) reasons[r.reason] = (reasons[r.reason] || 0) + 1;
    return {
      product: productById.get(g.product_id) ?? null,
      count: g._count._all,
      reasons,
      latest_detail: rows.find((r) => r.detail)?.detail ?? null,
      latest_at: g._max.created_at,
    };
  });
  return { items, total: all.length };
};

const findOpen = async (productId) => {
  const open = await prisma.productReport.findMany({
    where: { product_id: productId, status: REPORT_STATUS.OPEN },
    select: { id: true, reporter_id: true },
  });
  if (open.length === 0) throw new ProductReportError(404, "No open reports for this product");
  return open;
};

const closeReports = (open, status, adminId) =>
  prisma.productReport.updateMany({
    where: { id: { in: open.map((r) => r.id) }, status: REPORT_STATUS.OPEN },
    data: { status, resolved_by: adminId, resolved_at: new Date() },
  });

export const resolveReports = async (productId, reason, ctx) => {
  const open = await findOpen(productId);
  // Nhan bao cao truoc khi go: 2 admin bam cung luc thi chi nguoi nhan duoc
  // moi go san pham, bao seller va cam on nguoi bao cao
  const claimed = await closeReports(open, REPORT_STATUS.RESOLVED, ctx.userId);
  if (claimed.count === 0) throw new ProductReportError(409, "These reports were already handled");
  const current = await prisma.product.findUnique({
    where: { id: productId },
    select: { taken_down_at: true, deleted_at: true },
  });
  // Da go (bao cao den muon) hoac da xoa: khong go lai, tranh bao seller lan nua va ghi de ly do cu
  const product =
    current && !current.deleted_at && !current.taken_down_at
      ? await takedownProductById(productId, reason, ctx)
      : null;
  writeAuditLog({
    ...ctx,
    action: "PRODUCT_REPORT_RESOLVE",
    resource: "product",
    resourceId: productId,
    metadata: { reason, reports: open.length },
  });
  for (const r of open) {
    notifyUser({
      userId: r.reporter_id,
      title: "Report resolved",
      message: "Thanks for your report, we took action on the product you reported.",
      type: "SYSTEM",
    });
  }
  return { resolved: open.length, product };
};

export const dismissReports = async (productId, ctx) => {
  const open = await findOpen(productId);
  const claimed = await closeReports(open, REPORT_STATUS.DISMISSED, ctx.userId);
  if (claimed.count === 0) throw new ProductReportError(409, "These reports were already handled");
  writeAuditLog({
    ...ctx,
    action: "PRODUCT_REPORT_DISMISS",
    resource: "product",
    resourceId: productId,
    metadata: { reports: open.length },
  });
  return { dismissed: open.length };
};
