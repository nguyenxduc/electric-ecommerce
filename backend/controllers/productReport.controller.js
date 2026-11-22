import { asyncHandler } from "../middleware/error.middleware.js";
import { parsePagination, buildPaginationMeta } from "../lib/pagination.js";
import { auditContext } from "../services/audit.service.js";
import {
  createReport,
  listReportGroups,
  resolveReports,
  dismissReports,
  ProductReportError,
  REPORT_STATUS,
} from "../services/productReport.service.js";

const run = (fn) =>
  asyncHandler(async (req, res) => {
    try {
      return res.json({ success: true, data: await fn(req) });
    } catch (err) {
      if (err instanceof ProductReportError) {
        return res
          .status(err.status)
          .json({ success: false, error: err.message, ...(err.code && { code: err.code }) });
      }
      throw err;
    }
  });

// POST /api/products/:id/report { reason, detail? }
export const reportProduct = run((req) =>
  createReport(BigInt(req.user.id), BigInt(req.params.id), req.body ?? {})
);

// GET /api/product-reports?status=open|resolved|dismissed&page&limit (admin)
export const listReports = asyncHandler(async (req, res) => {
  const status = req.query.status ?? REPORT_STATUS.OPEN;
  if (!Object.values(REPORT_STATUS).includes(status)) {
    return res.status(400).json({ success: false, error: "Invalid status" });
  }
  const { currentPage, perPage, skip, take } = parsePagination(req.query.page, req.query.limit);
  const { items, total } = await listReportGroups(status, { skip, take });
  res.json({
    success: true,
    data: { reports: items, pagination: buildPaginationMeta(currentPage, perPage, total) },
  });
});

// POST /api/product-reports/:productId/resolve { reason } - go san pham + dong bao cao
export const resolveProductReports = run((req) => {
  const reason = String(req.body?.reason ?? "").trim();
  if (reason.length < 5 || reason.length > 500) {
    throw new ProductReportError(400, "Reason must be 5-500 characters");
  }
  return resolveReports(BigInt(req.params.productId), reason, auditContext(req));
});

// POST /api/product-reports/:productId/dismiss
export const dismissProductReports = run((req) =>
  dismissReports(BigInt(req.params.productId), auditContext(req))
);
