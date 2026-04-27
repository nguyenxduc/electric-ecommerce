import express from "express";
import {
  listAiChats,
  createAiChat,
  getAiMessages,
  sendAiChatMessage,
  deleteAiChat,
} from "../controllers/aiAssistant.controller.js";
import {
  createAiFeedback,
  getAiFeedbackStats,
  listAiFeedbackAdmin,
} from "../controllers/aiFeedback.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, listAiChats);
router.post("/", protectRoute, createAiChat);
// Phải khai báo trước /:chatId để không bị ăn nhầm
router.get("/feedback/stats", protectRoute, getAiFeedbackStats);
router.get("/feedback/list", protectRoute, listAiFeedbackAdmin);

router.get("/:chatId/messages", protectRoute, getAiMessages);
router.post("/:chatId/messages", protectRoute, sendAiChatMessage);
router.delete("/:chatId", protectRoute, deleteAiChat);
router.post("/:chatId/feedback", protectRoute, createAiFeedback);

export default router;

