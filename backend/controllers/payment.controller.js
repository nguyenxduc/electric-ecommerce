import { VNPay, ProductCode } from "vnpay";
import { prisma } from "../lib/db.js";

const requiredEnv = ["VNP_TMN_CODE", "VNP_HASH_SECRET"];

const hasConfig = () =>
  requiredEnv.every(key => (process.env[key] || "").trim().length > 0);

const buildClientIp = req => {
  const forwarded = req.headers["x-forwarded-for"];
  if (forwarded) {
    return forwarded.split(",")[0].trim();
  }
  return (req.socket?.remoteAddress || "").replace("::ffff:", "") || "127.0.0.1";
};

// Helper function to get setting value by key
const getSettingValue = async (key, defaultValue = null) => {
  try {
    const setting = await prisma.setting.findFirst({
      where: {
        key,
        deleted_at: null,
      },
    });
    if (!setting) return defaultValue;
    
    // Parse based on data type
    if (setting.data_type === "number") {
      return Number(setting.value);
    } else if (setting.data_type === "boolean") {
      return setting.value === "true";
    } else if (setting.data_type === "json") {
      try {
        return JSON.parse(setting.value);
      } catch {
        return setting.value;
      }
    }
    return setting.value;
  } catch (error) {
    console.error(`Error getting setting ${key}:`, error);
    return defaultValue;
  }
};

const vnpayInstance = () =>
  new VNPay({
    tmnCode: process.env.VNP_TMN_CODE || "",
    secureSecret: process.env.VNP_HASH_SECRET || "",
    vnpayHost: process.env.VNP_HOST || "https://sandbox.vnpayment.vn",
    testMode: process.env.VNP_TEST_MODE !== "false",
    hashAlgorithm: process.env.VNP_HASH_ALG || "SHA512",
  });

export const createVnpayPayment = async (req, res) => {
  try {
    if (!hasConfig()) {
      return res.status(500).json({
        message: "VNPAY config missing",
        required: requiredEnv,
      });
    }

    const { amount, orderInfo, bankCode } = req.body || {};
    const numericAmount = Number(amount);
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    const orderId = Date.now().toString();
    const clientIp = buildClientIp(req);
    const returnUrl =
      process.env.VNP_RETURN_URL ||
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-result`;

    const vnpay = vnpayInstance();
    const paymentUrl = vnpay.buildPaymentUrl({
      amount: Math.round(numericAmount * 100), // VNPAY expects amount in VND x 100
      bankCode: bankCode || undefined,
      orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      orderType: ProductCode.Other,
      orderId,
      locale: "vn",
      returnUrl,
      ipAddr: clientIp,
    });

    res.json({ paymentUrl, orderId });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create VNPAY payment",
      error: error?.message,
    });
  }
};

// Create QR code for bank transfer using VietQR API
export const createBankTransferQR = async (req, res) => {
  try {
    const { amount, orderInfo, accountName } = req.body || {};
    const numericAmount = Number(amount);
    
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    // Get bank config from Settings (fallback to env for backward compatibility)
    const bankId = await getSettingValue("bank_id", process.env.BANK_ID || "tpbank");
    const accountNo = await getSettingValue("bank_account_no", process.env.BANK_ACCOUNT_NO || "");
    const bankAccountName = await getSettingValue("bank_account_name", process.env.BANK_ACCOUNT_NAME || accountName || "Tech Shop");
    const template = await getSettingValue("qr_template", process.env.QR_TEMPLATE || "compact2");

    if (!accountNo) {
      return res.status(500).json({
        message: "Bank account number not configured. Please configure in Settings.",
        required: ["bank_id", "bank_account_no", "bank_account_name"],
      });
    }

    // Build VietQR URL
    // Format: https://img.vietqr.io/image/<BANK_ID>-<ACCOUNT_NO>-<TEMPLATE>.png?amount=<AMOUNT>&addInfo=<DESCRIPTION>&accountName=<ACCOUNT_NAME>
    const baseUrl = "https://img.vietqr.io/image";
    const qrUrl = `${baseUrl}/${bankId}-${accountNo}-${template}.png?amount=${Math.round(numericAmount)}&addInfo=${encodeURIComponent(orderInfo || `Thanh toan don hang ${Date.now()}`)}&accountName=${encodeURIComponent(bankAccountName)}`;

    const orderId = Date.now().toString();

    res.json({
      qrUrl,
      orderId,
      amount: numericAmount,
      accountNo,
      accountName: bankAccountName,
      bankId,
      orderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
    });
  } catch (error) {
    res.status(500).json({
      message: "Failed to create bank transfer QR",
      error: error?.message,
    });
  }
};

