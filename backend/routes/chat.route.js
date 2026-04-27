import express from "express";
import {
  getOrCreateChat,
  sendMessage,
  getAllChats,
  getChatById,
  updateChatStatus,
  markMessagesAsRead,
} from "../controllers/chat.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Customer routes
router.get("/", protectRoute, getOrCreateChat);
router.post("/message", protectRoute, sendMessage);
router.get("/:chatId", protectRoute, getChatById);
router.post("/:chatId/read", protectRoute, markMessagesAsRead);

// Admin routes
router.get("/admin/all", protectRoute, adminRoute, getAllChats);
router.put("/admin/:chatId/status", protectRoute, adminRoute, updateChatStatus);

export default router;

