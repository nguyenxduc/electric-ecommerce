import { Router } from "express";
import { createVnpayPayment, createBankTransferQR } from "../controllers/payment.controller.js";

const router = Router();

router.post("/vnpay", createVnpayPayment);
router.post("/bank-transfer-qr", createBankTransferQR);

export default router;

