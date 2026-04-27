import express from "express";
import { getDashboardStats, getTopProducts } from "../controllers/dashboard.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/stats", protectRoute, adminRoute, getDashboardStats);
router.get("/top-products", protectRoute, adminRoute, getTopProducts);

export default router;

