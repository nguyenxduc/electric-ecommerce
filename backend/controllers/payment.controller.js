import { VNPay, ProductCode } from "vnpay";
import { prisma } from "../lib/db.js";
import {
  resolveGatewayVndAmount,
  usdToGatewayVnd,
} from "../lib/gatewayAmount.js";
import crypto from "crypto";

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

    const { amount, orderInfo, bankCode, order_group_id } = req.body || {};

    // Prefer deriving the amount from the checkout server-side
    // (sum of still-active suborders - cancelled ones are not charged).
    let numericAmount = Number(amount);
    if (order_group_id != null && order_group_id !== "") {
      const orderGroup = await prisma.orderGroup.findFirst({
        where: { id: BigInt(order_group_id), deleted_at: null },
      });
      if (!orderGroup) {
        return res.status(404).json({ message: "Order group not found" });
      }
      if (orderGroup.user_id.toString() !== req.user.id) {
        return res.status(403).json({ message: "Not authorized" });
      }
      const activeAgg = await prisma.order.aggregate({
        _sum: { total_amount: true },
        where: {
          order_group_id: orderGroup.id,
          deleted_at: null,
          status: { notIn: ["cancelled", "returned"] },
        },
      });
      numericAmount = Number(activeAgg._sum.total_amount || 0);
    }
    if (!numericAmount || numericAmount <= 0) {
      return res.status(400).json({ message: "Invalid amount" });
    }

    let vndAmount;
    try {
      vndAmount = resolveGatewayVndAmount(numericAmount);
    } catch (err) {
      return res.status(err.status || 400).json({
        message: err.message,
        code: err.code,
        minVnd: err.minVnd,
        minUsd: err.minUsd,
        amountVnd: err.amountVnd,
      });
    }

    const orderId = Date.now().toString();
    const clientIp = buildClientIp(req);
    const returnUrl =
      process.env.VNP_RETURN_URL ||
      `${process.env.FRONTEND_URL || "http://localhost:5173"}/payment-result`;

    const vnpay = vnpayInstance();
    const paymentUrl = vnpay.buildPaymentUrl({
      amount: Math.round(vndAmount * 100),
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

export const createMomoPayment = async (req, res) => {
  try {
    const {
      orderInfo,
      order_group_id: rawGroupId,
      // legacy client field names kept as fallbacks during transition
      orderId: legacyOrderId,
      orderNumber: legacyOrderNumber,
    } = req.body || {};

    const groupId = rawGroupId ?? legacyOrderId;
    if (groupId == null || groupId === "") {
      return res.status(400).json({ message: "order_group_id is required" });
    }

    // Amount is always derived server-side from the checkout total —
    // never trusted from the client body.
    const orderGroup = await prisma.orderGroup.findFirst({
      where: { id: BigInt(groupId), deleted_at: null },
    });
    if (!orderGroup) {
      return res.status(404).json({ message: "Order group not found" });
    }
    if (orderGroup.user_id.toString() !== req.user.id) {
      return res.status(403).json({ message: "Not authorized" });
    }

    // Amount = sum of the checkout's still-active suborders (a cancelled
    // suborder must not be charged).
    const activeAgg = await prisma.order.aggregate({
      _sum: { total_amount: true },
      where: {
        order_group_id: orderGroup.id,
        deleted_at: null,
        status: { notIn: ["cancelled", "returned"] },
      },
    });
    const numericAmount = Number(activeAgg._sum.total_amount || 0);
    if (!numericAmount || numericAmount <= 0) {
      return res
        .status(400)
        .json({ message: "Nothing left to pay in this checkout" });
    }
    const internalOrderNumber = legacyOrderNumber || orderGroup.group_number;

    let vndAmount;
    try {
      vndAmount = resolveGatewayVndAmount(numericAmount);
    } catch (err) {
      return res.status(err.status || 400).json({
        message: err.message,
        code: err.code,
        minVnd: err.minVnd,
        minUsd: err.minUsd,
        amountVnd: err.amountVnd,
      });
    }

    const partnerCode =
      process.env.MOMO_PARTNER_CODE || "MOMO";
    const accessKey =
      process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85";
    const secretKey =
      process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";
    const endpoint =
      process.env.MOMO_ENDPOINT || "https://test-payment.momo.vn/v2/gateway/api/create";

    const requestId = `${partnerCode}${Date.now()}`;
    const momoOrderId = requestId;
    const requestType = "captureWallet";
    const extraData = "";
    const frontendBase = process.env.FRONTEND_URL || "http://localhost:5173";
    const redirectBase =
      process.env.MOMO_REDIRECT_URL || `${frontendBase}/payment-result`;
    const redirectUrl = `${redirectBase}${
      redirectBase.includes("?") ? "&" : "?"
    }method=momo&order=${encodeURIComponent(
      internalOrderNumber || ""
    )}&orderGroupId=${encodeURIComponent(
      orderGroup.id.toString()
    )}&requestId=${encodeURIComponent(requestId)}`;
    const ipnUrl =
      process.env.MOMO_IPN_URL || `${process.env.BACKEND_URL || "http://localhost:3000"}/api/payments/momo-ipn`;
    const finalOrderInfo = orderInfo || `Thanh toan don hang ${momoOrderId}`;

    const rawSignature =
      `accessKey=${accessKey}` +
      `&amount=${vndAmount}` +
      `&extraData=${extraData}` +
      `&ipnUrl=${ipnUrl}` +
      `&orderId=${momoOrderId}` +
      `&orderInfo=${finalOrderInfo}` +
      `&partnerCode=${partnerCode}` +
      `&redirectUrl=${redirectUrl}` +
      `&requestId=${requestId}` +
      `&requestType=${requestType}`;

    const signature = crypto
      .createHmac("sha256", secretKey)
      .update(rawSignature)
      .digest("hex");

    const requestBody = {
      partnerCode,
      accessKey,
      requestId,
      amount: `${vndAmount}`,
      orderId: momoOrderId,
      orderInfo: finalOrderInfo,
      redirectUrl,
      ipnUrl,
      extraData,
      requestType,
      signature,
      lang: "vi",
    };

    const momoRes = await fetch(endpoint, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
    const momoData = await momoRes.json();

    if (!momoRes.ok || momoData.resultCode !== 0) {
      return res.status(400).json({
        message: momoData?.message || "Failed to create MoMo payment",
        resultCode: momoData?.resultCode,
      });
    }

    // Persist payment so IPN callback can update status later.
    await prisma.payment.create({
      data: {
        order_group_id: orderGroup.id,
        provider: "momo",
        amount: numericAmount,
        currency: "USD",
        status: "pending",
        momo_order_id: momoOrderId,
        momo_request_id: requestId,
        pay_url: momoData.payUrl || null,
        deeplink: momoData.deeplink || null,
        qr_code_url: momoData.qrCodeUrl || null,
        signature,
        extra_data: extraData,
        result_code: momoData.resultCode,
        message: momoData.message,
        raw_response: momoData,
      },
    });

    res.json({
      qrUrl: momoData.qrCodeUrl || "",
      payUrl: momoData.payUrl || "",
      deeplink: momoData.deeplink || "",
      orderId: momoOrderId,
      requestId,
      amount: numericAmount,
      orderInfo: finalOrderInfo,
      partnerCode,
      resultCode: momoData.resultCode,
      message: momoData.message,
    });
  } catch (error) {
    if (error?.status === 400) {
      return res.status(400).json({
        message: error.message,
        code: error.code,
      });
    }
    res.status(500).json({
      message: "Failed to create MoMo payment",
      error: error?.message,
    });
  }
};

// Backward-compatible alias for old frontend clients.
export const createBankTransferQR = createMomoPayment;

export const momoIpnHandler = async (req, res) => {
  try {
    const data = { ...(req.body || {}), ...(req.query || {}) };
    const resultCode = data.resultCode ?? data.resultcode;
    const requestId = data.requestId ?? data.requestid;
    const transId = data.transId ?? data.transid;
    const momoOrderId = data.orderId ?? data.orderid;
    const message = data.message ?? data.errMsg ?? data.errorMessage ?? null;

    const isPaid = String(resultCode) === "0" || String(resultCode) === "00";

    if (!requestId && !momoOrderId) {
      return res.status(200).send("success");
    }

    const payment = await prisma.payment.findFirst({
      where: requestId
        ? { momo_request_id: String(requestId) }
        : { momo_order_id: String(momoOrderId) },
    });

    if (!payment) {
      return res.status(200).send("success");
    }

    await prisma.$transaction(async tx => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isPaid ? "paid" : "failed",
          momo_trans_id: transId ? String(transId) : null,
          result_code:
            resultCode != null && resultCode !== ""
              ? Number(resultCode)
              : null,
          message: message || payment.message,
          paid_at: isPaid ? payment.paid_at ?? new Date() : null,
          raw_response: data,
        },
      });

      // When paid, move every shop-order of this checkout forward.
      // (Avoid overriding cancelled/shipped orders.)
      if (isPaid) {
        await tx.order.updateMany({
          where: {
            order_group_id: payment.order_group_id,
            status: "pending",
            deleted_at: null,
          },
          data: { status: "processing" },
        });
      }
    });

    return res.status(200).send("success");
  } catch (error) {
    console.error("MoMo IPN error:", error);
    // Still respond success to prevent repeated retries while we fix the root cause.
    return res.status(200).send("success");
  }
};

