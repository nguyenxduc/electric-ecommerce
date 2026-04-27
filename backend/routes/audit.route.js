import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { listAuditLogs } from "../controllers/audit.controller.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, listAuditLogs);

export default router;

