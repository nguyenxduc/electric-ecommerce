import express from "express";
import {
  getOrCreateChat,
  sendMessage,
  getAllChats,
  getChatById,
  updateChatStatus,
  markMessagesAsRead,
} from "../controllers/chat.controller.js";
import {
  protectRoute,
  adminRoute,
  sellerRoute,
} from "../middleware/auth.middleware.js";

const router = express.Router();

// Customer routes (?shop_id= opens a chat with that shop)
router.get("/", protectRoute, getOrCreateChat);
router.post("/message", protectRoute, sendMessage);

// Seller inbox: own shop's buyer chats
router.get("/shop/mine", protectRoute, sellerRoute, getAllChats);

router.get("/:chatId", protectRoute, getChatById);
router.post("/:chatId/read", protectRoute, markMessagesAsRead);

// Admin routes (platform support chats)
router.get("/admin/all", protectRoute, adminRoute, getAllChats);
router.put("/admin/:chatId/status", protectRoute, adminRoute, updateChatStatus);

export default router;

