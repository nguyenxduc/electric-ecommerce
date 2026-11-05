// Danh gia rui ro gian lan luc checkout. Moi nguong chinh duoc qua bang settings:
//   cod_require_verified_phone (false), fraud_block_score (100), fraud_review_score (40),
//   fraud_velocity_orders_per_hour (5), fraud_new_account_cod_amount (500, USD).
// Diem: velocity +40, tai khoan moi+COD+gia tri cao +30, tung that bai COD +30,
// trung SDT/thiet bi chu shop +60 moi loai, chung IP voi nguoi da dung coupon +10.
// IP rieng le KHONG chan (NAT, wifi chung); SDT/thiet bi/dia chi trung moi chan coupon.
import { prisma } from "../lib/db.js";
import { notifyAdmins } from "../lib/notify.js";
import { normalizeVnPhone } from "../lib/sms.js";

const DEFAULTS = {
  cod_require_verified_phone: 0,
  fraud_block_score: 100,
  fraud_review_score: 40,
  fraud_velocity_orders_per_hour: 5,
  fraud_new_account_cod_amount: 500,
};

// Mot query cho tat ca setting; gia tri "true"/"false" duoc coi la 1/0.
const loadSettings = async () => {
  const rows = await prisma.setting.findMany({
    where: { key: { in: Object.keys(DEFAULTS) }, deleted_at: null },
    select: { key: true, value: true },
  });
  const out = { ...DEFAULTS };
  for (const { key, value } of rows) {
    const v = String(value).trim().toLowerCase();
    const n = v === "true" ? 1 : v === "false" ? 0 : Number(v);
    if (Number.isFinite(n)) out[key] = n;
  }
  return out;
};

// SDT ngan (vd. "099" trong du lieu demo) khong du de doi chieu -> null.
export const phoneKey = (raw) => {
  const p = normalizeVnPhone(raw) || String(raw ?? "").replace(/\D/g, "");
  return p.length >= 9 ? p : null;
};

// Gop cac truong dia chi (bo ten/SDT/email) thanh chuoi so sanh; qua ngan -> null.
const addressKey = (addr) => {
  if (!addr || typeof addr !== "object") return null;
  const text = Object.entries(addr)
    .filter(([k, v]) => typeof v === "string" && !/^(name|phone|email|note)/i.test(k))
    .map(([, v]) => v)
    .join(" ");
  const key = text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
  return key.length >= 15 ? key : null;
};

const checkCouponAbuse = async (ctx, reasons) => {
  const prior = await prisma.orderGroup.findMany({
    where: { coupon_id: ctx.coupon.id, user_id: { not: BigInt(ctx.userId) } },
    select: { receiver_phone: true, device_id: true, client_ip: true, shipping_address: true },
    orderBy: { created_at: "desc" },
    take: 200,
  });
  // Khop thiet bi chinh xac khong duoc phep bi day ra ngoai cua so 200 dong
  const sameDevice = ctx.deviceId
    ? await prisma.orderGroup.findFirst({
        where: { coupon_id: ctx.coupon.id, user_id: { not: BigInt(ctx.userId) }, device_id: ctx.deviceId },
        select: { id: true },
      })
    : null;
  const phone = phoneKey(ctx.receiverPhone);
  const addr = addressKey(ctx.address);
  let blocked = false;
  let ipShared = false;
  if (sameDevice) {
    blocked = true;
    reasons.add("COUPON_SAME_DEVICE");
  }
  for (const g of prior) {
    if (phone && phoneKey(g.receiver_phone) === phone) {
      blocked = true;
      reasons.add("COUPON_SAME_PHONE");
    }
    if (addr && addressKey(g.shipping_address) === addr) {
      blocked = true;
      reasons.add("COUPON_SAME_ADDRESS");
    }
    if (ctx.clientIp && g.client_ip === ctx.clientIp) ipShared = true;
  }
  return { blocked, ipShared };
};

const checkSelfDealing = async (ctx, user, reasons) => {
  const owners = [...new Set((ctx.shopOwnerIds || []).map(String))].map(BigInt);
  if (owners.length === 0) return 0;
  const [ownerRows, ownerGroups] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: owners } }, select: { phone: true } }),
    ctx.deviceId
      ? prisma.orderGroup.findFirst({
          where: { user_id: { in: owners }, device_id: ctx.deviceId },
          select: { id: true },
        })
      : null,
  ]);
  const ownerPhones = new Set(ownerRows.map((o) => phoneKey(o.phone)).filter(Boolean));
  const mine = [phoneKey(ctx.receiverPhone), phoneKey(user?.phone)].filter(Boolean);
  let score = 0;
  if (mine.some((p) => ownerPhones.has(p))) {
    reasons.add("SELF_DEALING_PHONE");
    score += 60;
  }
  if (ownerGroups) {
    reasons.add("SELF_DEALING_DEVICE");
    score += 60;
  }
  return score;
};

/**
 * @param {object} ctx { userId, paymentMethod, receiverPhone, address,
 *   coupon, clientIp, deviceId, finalAmount, shopOwnerIds }
 * @returns {Promise<{block:boolean, couponBlocked:boolean, score:number,
 *   reasons:string[], flag:boolean, code?:string, message?:string}>}
 */
export const assessCheckoutRisk = async (ctx) => {
  const userId = BigInt(ctx.userId);
  const isCod = ctx.paymentMethod === "cod";
  const [cfg, user] = await Promise.all([
    loadSettings(),
    prisma.user.findUnique({
      where: { id: userId },
      select: { created_at: true, phone: true, phone_verified_at: true },
    }),
  ]);

  const result = { block: false, couponBlocked: false, score: 0, reasons: [], flag: false };

  // Phai xac thuc SDT va SDT nhan hang phai la chinh SDT da xac thuc, neu khong OTP chi la thu tuc
  if (
    cfg.cod_require_verified_phone &&
    isCod &&
    (!user?.phone_verified_at || phoneKey(ctx.receiverPhone) !== phoneKey(user.phone))
  ) {
    return {
      ...result,
      block: true,
      code: "PHONE_VERIFICATION_REQUIRED",
      message: "Please verify your phone number to place a cash-on-delivery order.",
      reasons: ["PHONE_VERIFICATION_REQUIRED"],
    };
  }

  const reasons = new Set();
  let score = 0;

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [recent, failedCod, abuse, selfScore] = await Promise.all([
    prisma.orderGroup.count({ where: { user_id: userId, created_at: { gte: hourAgo } } }),
    // Don COD cua user da that bai: van don bi tra/loi, hoac huy sau khi da tao van don.
    isCod
      ? prisma.order.count({
          where: {
            user_id: userId,
            payment_method: "cod",
            OR: [
              { shipment: { status: { in: ["returned", "failed"] } } },
              { status: "cancelled", shipment: { isNot: null } },
            ],
          },
        })
      : 0,
    ctx.coupon ? checkCouponAbuse(ctx, reasons) : { blocked: false, ipShared: false },
    checkSelfDealing(ctx, user, reasons),
  ]);

  if (recent >= cfg.fraud_velocity_orders_per_hour) {
    reasons.add("VELOCITY");
    score += 40;
  }
  const isNew = user && Date.now() - user.created_at.getTime() < 24 * 60 * 60 * 1000;
  if (isNew && isCod && Number(ctx.finalAmount) > cfg.fraud_new_account_cod_amount) {
    reasons.add("NEW_ACCOUNT_HIGH_COD");
    score += 30;
  }
  if (failedCod > 0) {
    reasons.add("PAST_FAILED_COD");
    score += 30;
  }
  if (abuse.ipShared) {
    reasons.add("COUPON_SHARED_IP");
    score += 10;
  }
  score += selfScore;
  // Thieu device id lam yeu tin hieu chong lam dung coupon/tu mua; chi cong nhe de khong chan nham
  if (!ctx.deviceId) {
    reasons.add("NO_DEVICE_ID");
    score += 10;
  }

  result.score = score;
  result.reasons = [...reasons];
  result.flag = score >= cfg.fraud_review_score;
  if (abuse.blocked) {
    result.couponBlocked = true;
    result.code = "COUPON_ABUSE";
  }
  if (score >= cfg.fraud_block_score) {
    result.block = true;
    result.code = "ORDER_BLOCKED";
  }
  return result;
};

/** Ghi FraudFlag sau khi don da tao (ngoai giao dich, loi khong lam hong don). */
export const recordCheckoutRisk = async (orderGroup, assessment, ctx) => {
  if (!assessment?.flag) return;
  const type = assessment.reasons.some((r) => r.startsWith("SELF_DEALING"))
    ? "SELF_DEALING"
    : "ORDER_RISK";
  try {
    await prisma.fraudFlag.create({
      data: {
        type,
        subject: "order_group",
        subject_id: orderGroup.id,
        user_id: BigInt(ctx.userId),
        score: assessment.score,
        reasons: assessment.reasons,
      },
    });
  } catch (err) {
    if (err?.code === "P2002") return; // da co flag -> khong bao lai
    throw err;
  }
  await notifyAdmins({
    title: "Don hang co rui ro gian lan",
    message: `Don ${orderGroup.group_number} (${type}, diem ${assessment.score}): ${assessment.reasons.join(", ")}`,
    type: "SYSTEM",
  });
};
