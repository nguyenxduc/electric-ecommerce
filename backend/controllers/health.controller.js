import { snapshot } from "../middleware/metrics.middleware.js";
import { aiCallsToday } from "../ai/geminiConfig.js";

// GET /api/health - so lieu van hanh cho admin: latency/loi theo route
// (metrics.middleware.js) + so luot goi Gemini trong ngay (ai/geminiConfig.js).
// Tat ca doc tu bo nho process nen reset moi lan restart backend.
export const getHealth = (req, res) => {
  res.json({
    success: true,
    data: { ...snapshot(), ai_calls_today: aiCallsToday() },
  });
};
