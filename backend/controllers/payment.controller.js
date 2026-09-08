import { VNPay, ProductCode } from "vnpay";
import { prisma } from "../lib/db.js";
import { ORDER_STATUS, PAYMENT_STATUS } from "../constants/status.js";
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

    const { orderInfo, bankCode, order_group_id } = req.body || {};
    if (order_group_id == null || order_group_id === "") {
      return res.status(400).json({ message: "order_group_id is required" });
    }

    // Amount is always derived server-side from the checkout total (sum of
    // still-active suborders - cancelled ones are not charged) - never
    // trusted from the client body.
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
        status: {
          notIn: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED],
        },
      },
    });
    const numericAmount = Number(activeAgg._sum.total_amount || 0);
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
    // The vnpay library requires its own vnp_-prefixed field names and
    // multiplies vnp_Amount by 100 internally - passing camelCase fields (as
    // this used to) left vnp_Amount/vnp_TxnRef undefined and produced a
    // broken payment URL for every VNPay checkout.
    const paymentUrl = vnpay.buildPaymentUrl({
      vnp_Amount: vndAmount,
      vnp_TxnRef: orderId,
      vnp_BankCode: bankCode || undefined,
      vnp_OrderInfo: orderInfo || `Thanh toan don hang ${orderId}`,
      vnp_OrderType: ProductCode.Other,
      vnp_Locale: "vn",
      vnp_ReturnUrl: returnUrl,
      vnp_IpAddr: clientIp,
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
        status: {
            notIn: [ORDER_STATUS.CANCELLED, ORDER_STATUS.RETURNED],
          },
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
        status: PAYMENT_STATUS.PENDING,
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

// MoMo ky moi callback IPN bang HMAC-SHA256 tren mot chuoi truong da sap xep.
// Neu khong kiem chung chu ky thi endpoint nay la cong mo: bat ky ai doan duoc
// requestId deu co the POST resultCode=0 de danh dau don da thanh toan ma khong
// tra dong nao. Thu tu cac truong duoi day la thu tu MoMo quy dinh cho IPN v2.
const verifyMomoIpnSignature = (data) => {
  const secretKey =
    process.env.MOMO_SECRET_KEY || "K951B6PE1waDMi640xX08PD3vg6EkVlz";
  const accessKey = process.env.MOMO_ACCESS_KEY || "F8BBA842ECF85";
  const provided = String(data.signature || "");
  if (!provided) return false;

  const field = (value) => (value == null ? "" : String(value));
  const rawSignature =
    `accessKey=${accessKey}` +
    `&amount=${field(data.amount)}` +
    `&extraData=${field(data.extraData)}` +
    `&message=${field(data.message)}` +
    `&orderId=${field(data.orderId)}` +
    `&orderInfo=${field(data.orderInfo)}` +
    `&orderType=${field(data.orderType)}` +
    `&partnerCode=${field(data.partnerCode)}` +
    `&payType=${field(data.payType)}` +
    `&requestId=${field(data.requestId)}` +
    `&responseTime=${field(data.responseTime)}` +
    `&resultCode=${field(data.resultCode)}` +
    `&transId=${field(data.transId)}`;

  const expected = crypto
    .createHmac("sha256", secretKey)
    .update(rawSignature)
    .digest("hex");

  const a = Buffer.from(expected, "utf8");
  const b = Buffer.from(provided, "utf8");
  // So sanh chong tan cong do thoi gian.
  return a.length === b.length && crypto.timingSafeEqual(a, b);
};

export const momoIpnHandler = async (req, res) => {
  try {
    const data = { ...(req.body || {}), ...(req.query || {}) };
    const resultCode = data.resultCode ?? data.resultcode;
    const requestId = data.requestId ?? data.requestid;
    const transId = data.transId ?? data.transid;
    const momoOrderId = data.orderId ?? data.orderid;
    const message = data.message ?? data.errMsg ?? data.errorMessage ?? null;

    if (!verifyMomoIpnSignature(data)) {
      console.warn(
        "[momo-ipn] Tu choi callback: chu ky khong hop le",
        { requestId, momoOrderId }
      );
      return res
        .status(400)
        .json({ success: false, error: "Invalid signature" });
    }

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

    // Chong sua so tien: callback phai khop dung so tien da ghi khi tao giao dich.
    const callbackAmount = Number(data.amount);
    if (isPaid && Number.isFinite(callbackAmount)) {
      const expectedAmount = Number(payment.amount);
      if (Number.isFinite(expectedAmount) && callbackAmount !== expectedAmount) {
        console.warn("[momo-ipn] Tu choi callback: so tien khong khop", {
          expected: expectedAmount,
          received: callbackAmount,
        });
        return res
          .status(400)
          .json({ success: false, error: "Amount mismatch" });
      }
    }

    await prisma.$transaction(async tx => {
      await tx.payment.update({
        where: { id: payment.id },
        data: {
          status: isPaid ? PAYMENT_STATUS.PAID : PAYMENT_STATUS.FAILED,
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
            status: ORDER_STATUS.PENDING,
            deleted_at: null,
          },
          data: { status: ORDER_STATUS.PROCESSING },
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

