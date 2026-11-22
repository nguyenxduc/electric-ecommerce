import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { registerIdParams } from "../middleware/validateId.middleware.js";
import {
  listReports,
  resolveProductReports,
  dismissProductReports,
} from "../controllers/productReport.controller.js";

const router = express.Router();
registerIdParams(router);

// Hang doi kiem duyet bao cao san pham: chi admin
router.use(protectRoute, adminRoute);
router.get("/", listReports);
router.post("/:productId/resolve", resolveProductReports);
router.post("/:productId/dismiss", dismissProductReports);

export default router;
