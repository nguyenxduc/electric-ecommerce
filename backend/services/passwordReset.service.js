// Quen mat khau bang ma 6 so gui qua email. Dung chung bang otp_codes voi OTP so dien thoai
// (purpose = "reset_password", cot phone chua dia chi email nhan ma): ma bam, het han,
// cooldown, han muc theo gio va toi da 5 lan nhap sai moi ma.
// Khong lo email nao da dang ky: email la hay khong ton tai deu nhan cung mot cau tra loi.
import crypto from "node:crypto";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db.js";
import { ACCESS_TOKEN_SECRET } from "../lib/jwtSecret.js";

export const RESET_PURPOSE = "reset_password";
const TTL_MS = 10 * 60 * 1000;
const COOLDOWN_MS = 60 * 1000;
const MAX_PER_HOUR = 5;
const MAX_ATTEMPTS = 5;
export const MIN_PASSWORD = 6;

export class PasswordResetError extends Error {
  constructor(status, message, extra = {}) {
    super(message);
    this.status = status;
    this.extra = extra;
  }
}

const normalizeEmail = (email) => String(email ?? "").trim().toLowerCase();
const isEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) && email.length <= 254;

// Gan ma voi email + muc dich de ma nay khong dung duoc cho email/muc dich khac.
const hashCode = (code, email) =>
  crypto
    .createHash("sha256")
    .update(`${RESET_PURPOSE}:${code}:${email}:${ACCESS_TOKEN_SECRET}`)
    .digest("hex");

const findUser = (email) =>
  prisma.user.findFirst({
    where: { email: { equals: email, mode: "insensitive" }, deleted_at: null },
    select: { id: true, email: true },
  });

/**
 * Tao ma dat lai. Tra ve { code, to } khi can gui email, hoac null khi email khong ton tai
 * (controller van tra loi giong het). Nem PasswordResetError 400/429.
 */
export const requestPasswordReset = async (rawEmail) => {
  const email = normalizeEmail(rawEmail);
  if (!isEmail(email)) throw new PasswordResetError(400, "A valid email is required");

  const user = await findUser(email);
  if (!user) return null;

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const where = { user_id: user.id, purpose: RESET_PURPOSE };
  const [last, recent] = await Promise.all([
    prisma.otpCode.findFirst({ where, orderBy: { created_at: "desc" } }),
    prisma.otpCode.count({ where: { ...where, created_at: { gte: hourAgo } } }),
  ]);
  // Cooldown / qua han muc: im lang (tra null nhu email khong ton tai), khong nem 429,
  // vi 429 chi xay ra voi email co that -> lai do duoc tai khoan. Ma cu van con han.
  if (last && Date.now() - last.created_at.getTime() < COOLDOWN_MS) return null;
  if (recent >= MAX_PER_HOUR) return null;

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.create({
    data: {
      user_id: user.id,
      phone: email,
      purpose: RESET_PURPOSE,
      code_hash: hashCode(code, email),
      expires_at: new Date(Date.now() + TTL_MS),
    },
  });
  return { code, to: user.email, expiresIn: TTL_MS / 1000 };
};

/** Doi mat khau bang ma. Tra ve userId de ghi audit. Nem PasswordResetError 400/429. */
export const resetPasswordWithCode = async ({ email: rawEmail, code: rawCode, newPassword }) => {
  const email = normalizeEmail(rawEmail);
  const code = String(rawCode ?? "").trim();
  if (!isEmail(email) || !/^\d{6}$/.test(code)) {
    throw new PasswordResetError(400, "Email and 6-digit code are required");
  }
  if (typeof newPassword !== "string" || newPassword.length < MIN_PASSWORD) {
    throw new PasswordResetError(400, `Password must be at least ${MIN_PASSWORD} characters`);
  }

  const user = await findUser(email);
  const otp = user
    ? await prisma.otpCode.findFirst({
        where: { user_id: user.id, purpose: RESET_PURPOSE, consumed_at: null },
        orderBy: { created_at: "desc" },
      })
    : null;
  if (!otp || otp.expires_at < new Date()) {
    throw new PasswordResetError(400, "Invalid or expired code. Please request a new one.");
  }
  // Tang attempts nguyen tu truoc khi so sanh: request song song khong vuot gioi han.
  const bumped = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumed_at: null, attempts: { lt: MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (bumped.count === 0) {
    throw new PasswordResetError(429, "Too many attempts. Please request a new code.");
  }
  const a = Buffer.from(hashCode(code, email));
  const b = Buffer.from(otp.code_hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    throw new PasswordResetError(400, "Invalid or expired code. Please request a new one.");
  }

  const passwordDigest = await bcrypt.hash(newPassword, 10);
  const ok = await prisma.$transaction(async (tx) => {
    // Dung mot lan: ma bi dung song song chi doi mat khau duoc mot lan
    const consumed = await tx.otpCode.updateMany({
      where: { id: otp.id, consumed_at: null },
      data: { consumed_at: new Date() },
    });
    if (consumed.count === 0) return false;
    // Ma dat lai cu con lai cua user cung het hieu luc
    await tx.otpCode.updateMany({
      where: { user_id: user.id, purpose: RESET_PURPOSE, consumed_at: null },
      data: { consumed_at: new Date() },
    });
    await tx.user.update({
      where: { id: user.id },
      // password_changed_at: moi phien dang mo (JWT cu) bi thu hoi
      data: {
        password_digest: passwordDigest,
        password_changed_at: new Date(),
        reset_code: null,
        reset_expires_at: null,
      },
    });
    return true;
  });
  if (!ok) throw new PasswordResetError(400, "Invalid or expired code. Please request a new one.");
  return user.id;
};
