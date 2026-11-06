import express from "express";
import {
  createReturnRequest,
  listShopReturns,
  resolveReturnRequest,
} from "../controllers/return.controller.js";
import {
  protectRoute,
  sellerRoute,
} from "../middleware/auth.middleware.js";

import { registerIdParams } from "../middleware/validateId.middleware.js";

const router = express.Router();
registerIdParams(router);

// Buyer requests a return on a delivered order
router.post("/", protectRoute, createReturnRequest);

// Seller inbox (own shop); admins pass sellerRoute too
router.get("/shop/mine", protectRoute, sellerRoute, listShopReturns);

// Seller (own shop) or admin resolves
router.patch("/:id/resolve", protectRoute, sellerRoute, resolveReturnRequest);

export default router;
