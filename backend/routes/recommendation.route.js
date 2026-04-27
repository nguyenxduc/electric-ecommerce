import express from "express";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";
import { getHomeRecommendations } from "../controllers/recommendation.controller.js";

const router = express.Router();

// Có userId khi đã đăng nhập; khách vẫn dùng cold-start + session header
router.get("/home", optionalAuth, getHomeRecommendations);

export default router;

