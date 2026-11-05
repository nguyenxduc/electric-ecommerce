import express from "express";
import {
  protectRoute,
  adminRoute,
  sellerRoute,
} from "../middleware/auth.middleware.js";
import { registerIdParams } from "../middleware/validateId.middleware.js";
import {
  getInvoiceByOrder,
  getInvoiceHtml,
  getShopInvoices,
  getAllInvoices,
  getShopTaxSummary,
  getTaxReport,
  getTaxReportCsv,
} from "../controllers/invoice.controller.js";

// Mount tai /api/invoices
const router = express.Router();
registerIdParams(router);
router.get("/orders/:orderId", protectRoute, getInvoiceByOrder);
router.get("/shop/mine", protectRoute, sellerRoute, getShopInvoices);
router.get("/:id/html", protectRoute, getInvoiceHtml);
router.get("/", protectRoute, adminRoute, getAllInvoices);

// Mount tai /api/tax
export const taxRouter = express.Router();
taxRouter.get("/shop/mine/summary", protectRoute, sellerRoute, getShopTaxSummary);
taxRouter.get("/report", protectRoute, adminRoute, getTaxReport);
taxRouter.get("/report.csv", protectRoute, adminRoute, getTaxReportCsv);

export default router;
