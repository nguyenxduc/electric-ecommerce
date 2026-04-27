import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import {
  listNotifications,
  markNotificationsRead,
  createNotification,
} from "../controllers/notification.controller.js";

const router = express.Router();

// User hiện tại xem thông báo
router.get("/", protectRoute, listNotifications);
router.post("/mark-read", protectRoute, markNotificationsRead);

// Admin tạo thông báo
router.post("/", protectRoute, adminRoute, createNotification);

export default router;

