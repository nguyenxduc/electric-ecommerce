import { Router } from "express";
import {
  createVnpayPayment,
  createBankTransferQR,
  createMomoPayment,
  momoIpnHandler,
} from "../controllers/payment.controller.js";

const router = Router();

router.post("/vnpay", createVnpayPayment);
router.post("/momo", createMomoPayment);
router.post("/momo-ipn", momoIpnHandler);
router.post("/bank-transfer-qr", createBankTransferQR);

export default router;

