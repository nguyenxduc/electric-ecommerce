import express from "express";
import { protectRoute, sellerRoute } from "../middleware/auth.middleware.js";
import { registerIdParams } from "../middleware/validateId.middleware.js";
import { putAnswer, removeQuestion, getShopQuestions } from "../controllers/productQuestion.controller.js";

const router = express.Router();
registerIdParams(router);

// Hoi dap san pham phia shop; hoi/xem cong khai nam o /api/products/:id/questions
router.get("/shop/mine", protectRoute, sellerRoute, getShopQuestions);
router.put("/:id/answer", protectRoute, sellerRoute, putAnswer);
router.delete("/:id", protectRoute, removeQuestion);

export default router;
