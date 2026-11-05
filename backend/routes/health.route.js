import express from "express";
import { getHealth } from "../controllers/health.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Chi admin: so lieu nay lo ra ban do route cua toan he thong.
router.get("/", protectRoute, adminRoute, getHealth);

export default router;
