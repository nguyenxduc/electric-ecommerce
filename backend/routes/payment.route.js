import { Router } from "express";
import {
  createVnpayPayment,
  createBankTransferQR,
  createMomoPayment,
  momoIpnHandler,
} from "../controllers/payment.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = Router();

router.post("/vnpay", protectRoute, createVnpayPayment);
router.post("/momo", protectRoute, createMomoPayment);
// MoMo's server calls this callback directly - must stay public (no user JWT).
router.post("/momo-ipn", momoIpnHandler);
router.post("/bank-transfer-qr", protectRoute, createBankTransferQR);

export default router;
