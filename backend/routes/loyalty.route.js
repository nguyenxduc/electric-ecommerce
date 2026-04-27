import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getLoyaltySummary, redeemPoints } from "../controllers/loyalty.controller.js";

const router = express.Router();

router.get("/me", protectRoute, getLoyaltySummary);
router.post("/redeem", protectRoute, redeemPoints);

export default router;

