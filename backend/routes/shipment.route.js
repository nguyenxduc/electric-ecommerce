import express from "express";
import {
  quote,
  createShipment,
  cancelShipment,
  getShipmentByOrder,
  getLabel,
  webhook,
  simulate,
  codPending,
  createSettlement,
  listSettlements,
  shopIdOfOrder,
  shopIdOfShipment,
} from "../controllers/shipment.controller.js";
import { protectRoute, adminRoute, sellerRoute } from "../middleware/auth.middleware.js";
import { requireShopOwnership } from "../lib/authz.js";
import { registerIdParams, NUMERIC_ID_PARAMS } from "../middleware/validateId.middleware.js";

// /api/shipping: bao gia
export const shippingRouter = express.Router();
shippingRouter.post("/quote", protectRoute, quote);

// /api/shipments
const router = express.Router();
registerIdParams(router, [...NUMERIC_ID_PARAMS, "orderId"]);

// Route tinh (cod, webhook, orders) dat truoc /:id
router.post("/webhook/:carrier", webhook);
router.get("/cod/pending", protectRoute, adminRoute, codPending);
router.get("/cod/settlements", protectRoute, adminRoute, listSettlements);
router.post("/cod/settlements", protectRoute, adminRoute, createSettlement);

router.post("/orders/:orderId", protectRoute, sellerRoute, requireShopOwnership(shopIdOfOrder), createShipment);
router.get("/orders/:orderId", protectRoute, getShipmentByOrder);

router.delete("/:id", protectRoute, sellerRoute, requireShopOwnership(shopIdOfShipment), cancelShipment);
router.get("/:id/label", protectRoute, sellerRoute, requireShopOwnership(shopIdOfShipment), getLabel);
router.post("/:id/simulate", protectRoute, sellerRoute, requireShopOwnership(shopIdOfShipment), simulate);

export default router;
