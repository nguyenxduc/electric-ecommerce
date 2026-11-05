import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db.js";
import { ACCESS_TOKEN_SECRET, ACCESS_TOKEN_TTL } from "../lib/jwtSecret.js";
import cloudinary from "../lib/cloudinary.js";
import nodemailer from "nodemailer";
import { promisify } from "util";
import { writeAuditLog } from "../services/audit.service.js";
import { asyncHandler } from "../middleware/error.middleware.js";
import crypto from "node:crypto";
import { normalizeVnPhone, sendSms, exposeDevCode } from "../lib/sms.js";

const generateAccessToken = (userId) => {
  const secret = ACCESS_TOKEN_SECRET;
  return jwt.sign({ userId }, secret, {
    expiresIn: ACCESS_TOKEN_TTL,
  });
};

// Helpers for OTP/email
const generateOtp = () =>
  Math.floor(100000 + Math.random() * 900000).toString();

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: Number(process.env.SMTP_PORT || 587),
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for others
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

const sendEmail = async ({ to, subject, html }) => {
  const from =
    process.env.MAIL_FROM || process.env.SMTP_USER || "no-reply@example.com";
  await transporter.sendMail({
    from,
    to,
    subject,
    html,
  });
};

export const signup = asyncHandler(async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({
      success: false,
      error: "Name, email and password are required",
    });
  }

  if (password.length < 6) {
    return res.status(400).json({
      success: false,
      error: "Password must be at least 6 characters long",
    });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return res.status(400).json({
      success: false,
      error: "Please provide a valid email address",
    });
  }

  const userExists = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });
  if (userExists) {
    return res.status(400).json({
      success: false,
      error: "Email already in use",
    });
  }

  const hashed = await bcrypt.hash(password, 10);

  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  const user = await prisma.user.create({
    data: {
      name,
      email,
      password_digest: hashed,
      email_verified: false,
      verification_code: otp,
      verification_expires_at: expires,
    },
  });

  // send verification email
  try {
    await sendEmail({
      to: email,
      subject: "Verify your Tech Shop account",
      html: `<p>Your verification code is:</p><h2>${otp}</h2><p>Code expires in 10 minutes.</p>`,
    });
  } catch (mailErr) {
    console.error("Send verification email error:", mailErr);
  }

  res.status(201).json({
    success: true,
    message: "User created. Verification code sent to email.",
    data: {
      verify_required: true,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        email_verified: user.email_verified,
      },
    },
  });
});

export const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({
      success: false,
      error: "Email and password are required",
    });
  }

  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });
  if (!user) {
    return res.status(401).json({
      success: false,
      error: "Invalid credentials",
    });
  }

  const isMatch =
    user && user.password_digest
      ? await bcrypt.compare(password, user.password_digest)
      : false;
  if (!isMatch) {
    return res.status(401).json({
      success: false,
      error: "Invalid credentials",
    });
  }

  if (!user.email_verified) {
    return res.status(403).json({
      success: false,
      error: "Email not verified. Please verify your email.",
    });
  }

  const accessToken = generateAccessToken(user.id.toString());

  // Audit log đăng nhập
  writeAuditLog({
    userId: user.id.toString(),
    action: "LOGIN",
    resource: "user",
    resourceId: user.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
    metadata: { email },
  });

  res.status(200).json({
    success: true,
    message: "Login successful",
    data: {
      accessToken,
      user: {
        id: user.id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        phone: user.phone,
        phone_verified: !!user.phone_verified_at,
        email_verified: user.email_verified,
      },
    },
  });
});

export const logout = (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: "Logged out successfully",
    });
  } catch (err) {
    console.error("Logout error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const getProfile = asyncHandler(async (req, res) => {
  // Check if req.user exists (middleware might not be active)
  if (!req.user || !req.user.id) {
    return res.status(401).json({
      success: false,
      error: "Unauthorized - User not authenticated",
    });
  }

  const user = await prisma.user.findFirst({
    where: { id: BigInt(req.user.id), deleted_at: null },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  res.status(200).json({
    success: true,
    data: {
      id: user.id.toString(),
      name: user.name,
      email: user.email,
      role: user.role,
      phone: user.phone,
      phone_verified: !!user.phone_verified_at,
      address: user.address,
      avatar: user.avatar,
      loyalty_points: user.loyalty_points ?? 0,
      segment: user.segment ?? null,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    },
  });
});

export const updateProfile = asyncHandler(async (req, res) => {
  const { user: userBody } = req.body;
  const { name, phone, address } = userBody || req.body;
  const userId = req.user.id;

  const user = await prisma.user.findFirst({
    where: { id: BigInt(userId), deleted_at: null },
  });
  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  const updatedUser = await prisma.user.update({
    where: { id: BigInt(userId) },
    data: {
      name: name ?? undefined,
      phone: phone ?? undefined,
      // Doi SDT thi mat xac thuc, phai OTP lai.
      ...(phone !== undefined &&
        (normalizeVnPhone(phone) ?? phone) !== (normalizeVnPhone(user.phone) ?? user.phone) && {
          phone_verified_at: null,
        }),
      address: address ?? undefined,
    },
  });

  res.status(200).json({
    success: true,
    message: "Profile updated successfully",
    data: {
      id: updatedUser.id.toString(),
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      phone: updatedUser.phone,
      phone_verified: !!updatedUser.phone_verified_at,
      address: updatedUser.address,
      avatar: updatedUser.avatar,
      createdAt: updatedUser.created_at,
      updatedAt: updatedUser.updated_at,
    },
  });
});

export const changePassword = asyncHandler(async (req, res) => {
  const { current_password, new_password } = req.body;
  const userId = req.user.id;

  if (!current_password || !new_password) {
    return res
      .status(400)
      .json({ success: false, error: "Missing password fields" });
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
  });
  if (!user || !user.password_digest) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  const ok = await bcrypt.compare(current_password, user.password_digest);
  if (!ok)
    return res
      .status(400)
      .json({ success: false, error: "Current password incorrect" });

  if (new_password.length < 6) {
    return res.status(400).json({
      success: false,
      error: "New password must be at least 6 characters",
    });
  }

  const hashed = await bcrypt.hash(new_password, 10);
  await prisma.user.update({
    where: { id: BigInt(userId) },
    data: { password_digest: hashed },
  });

  writeAuditLog({
    userId,
    action: "CHANGE_PASSWORD",
    resource: "user",
    resourceId: userId,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });

  res.json({ success: true, message: "Password changed successfully" });
});

export const resendVerification = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Email is required" });
  }

  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  if (user.email_verified) {
    return res
      .status(400)
      .json({ success: false, error: "Email already verified" });
  }

  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      verification_code: otp,
      verification_expires_at: expires,
    },
  });

  await sendEmail({
    to: email,
    subject: "Verify your Tech Shop account",
    html: `<p>Your verification code is:</p><h2>${otp}</h2><p>Code expires in 10 minutes.</p>`,
  });

  res.json({ success: true, message: "Verification code sent" });
});

export const verifyEmail = asyncHandler(async (req, res) => {
  const { email, code } = req.body;
  if (!email || !code) {
    return res
      .status(400)
      .json({ success: false, error: "Email and code are required" });
  }

  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  if (user.email_verified) {
    return res
      .status(400)
      .json({ success: false, error: "Email already verified" });
  }
  if (!user.verification_code || !user.verification_expires_at) {
    return res.status(400).json({
      success: false,
      error: "No verification code. Please request again.",
    });
  }
  const now = new Date();
  if (now > user.verification_expires_at) {
    return res
      .status(400)
      .json({ success: false, error: "Verification code expired" });
  }
  if (String(code).trim() !== user.verification_code) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid verification code" });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      email_verified: true,
      verification_code: null,
      verification_expires_at: null,
    },
  });

  res.json({ success: true, message: "Email verified successfully" });
});

export const forgotPassword = asyncHandler(async (req, res) => {
  const { email } = req.body;
  if (!email) {
    return res
      .status(400)
      .json({ success: false, error: "Email is required" });
  }

  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }

  const otp = generateOtp();
  const expires = new Date(Date.now() + 10 * 60 * 1000);

  await prisma.user.update({
    where: { id: user.id },
    data: {
      reset_code: otp,
      reset_expires_at: expires,
    },
  });

  await sendEmail({
    to: email,
    subject: "Reset your Tech Shop password",
    html: `<p>Your password reset code is:</p><h2>${otp}</h2><p>Code expires in 10 minutes.</p>`,
  });

  res.json({ success: true, message: "Reset code sent to email" });
});

export const resetPassword = asyncHandler(async (req, res) => {
  const { email, code, new_password } = req.body;
  if (!email || !code || !new_password) {
    return res.status(400).json({
      success: false,
      error: "Email, code, and new password are required",
    });
  }
  if (new_password.length < 6) {
    return res.status(400).json({
      success: false,
      error: "Password must be at least 6 characters",
    });
  }

  const user = await prisma.user.findFirst({
    where: { email, deleted_at: null },
  });
  if (!user) {
    return res.status(404).json({ success: false, error: "User not found" });
  }
  if (!user.reset_code || !user.reset_expires_at) {
    return res
      .status(400)
      .json({ success: false, error: "No reset code. Request again." });
  }
  const now = new Date();
  if (now > user.reset_expires_at) {
    return res
      .status(400)
      .json({ success: false, error: "Reset code expired" });
  }
  if (String(code).trim() !== user.reset_code) {
    return res
      .status(400)
      .json({ success: false, error: "Invalid reset code" });
  }

  const hashed = await bcrypt.hash(new_password, 10);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      password_digest: hashed,
      reset_code: null,
      reset_expires_at: null,
    },
  });

  res.json({ success: true, message: "Password reset successfully" });
});

// Upload avatar
export const uploadAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  if (!req.file) {
    return res.status(400).json({
      success: false,
      error: "No file uploaded",
    });
  }

  // Validate file type
  const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  if (!allowedTypes.includes(req.file.mimetype)) {
    return res.status(400).json({
      success: false,
      error: "Invalid file type. Only JPEG, PNG, and WebP are allowed",
    });
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024; // 5MB
  if (req.file.size > maxSize) {
    return res.status(400).json({
      success: false,
      error: "File size too large. Maximum size is 5MB",
    });
  }

  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  // Delete old avatar from Cloudinary if exists
  if (user.avatar) {
    try {
      // Extract public_id from Cloudinary URL
      const urlParts = user.avatar.split("/");
      const filename = urlParts[urlParts.length - 1];
      const publicId = filename.split(".")[0];
      const folder = urlParts[urlParts.length - 2];
      const fullPublicId = folder ? `${folder}/${publicId}` : publicId;

      await cloudinary.uploader.destroy(fullPublicId);
    } catch (deleteError) {
      console.error("Error deleting old avatar:", deleteError);
      // Continue even if deletion fails
    }
  }

  // Upload new avatar to Cloudinary
  const uploadResult = await new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream(
      {
        folder: "avatars",
        transformation: [
          { width: 400, height: 400, crop: "fill", gravity: "face" },
          { quality: "auto" },
        ],
      },
      (error, result) => {
        if (error) reject(error);
        else resolve(result);
      }
    );
    uploadStream.end(req.file.buffer);
  });

  // Update user avatar
  const updatedUser = await prisma.user.update({
    where: { id: BigInt(userId) },
    data: { avatar: uploadResult.secure_url },
  });

  res.status(200).json({
    success: true,
    message: "Avatar uploaded successfully",
    data: {
      avatar: updatedUser.avatar,
    },
  });
});

// Delete avatar
export const deleteAvatar = asyncHandler(async (req, res) => {
  const userId = req.user.id;

  const user = await prisma.user.findUnique({
    where: { id: BigInt(userId) },
  });

  if (!user) {
    return res.status(404).json({
      success: false,
      error: "User not found",
    });
  }

  if (!user.avatar) {
    return res.status(400).json({
      success: false,
      error: "No avatar to delete",
    });
  }

  // Delete avatar from Cloudinary
  try {
    const urlParts = user.avatar.split("/");
    const filename = urlParts[urlParts.length - 1];
    const publicId = filename.split(".")[0];
    const folder = urlParts[urlParts.length - 2];
    const fullPublicId = folder ? `${folder}/${publicId}` : publicId;

    await cloudinary.uploader.destroy(fullPublicId);
  } catch (deleteError) {
    console.error("Error deleting avatar from Cloudinary:", deleteError);
    // Continue even if deletion fails
  }

  // Update user to remove avatar
  const updatedUser = await prisma.user.update({
    where: { id: BigInt(userId) },
    data: { avatar: null },
  });

  res.status(200).json({
    success: true,
    message: "Avatar deleted successfully",
    data: {
      avatar: null,
    },
  });
});

// ---------------- Xac thuc SDT bang OTP ----------------
const OTP_TTL_MS = 5 * 60 * 1000;
const OTP_COOLDOWN_MS = 60 * 1000;
const OTP_MAX_PER_HOUR = 5;
const OTP_MAX_ATTEMPTS = 5;

// Gan ma voi phone de ma cua SDT nay khong dung duoc cho SDT khac.
const hashOtp = (code, phone) =>
  crypto.createHash("sha256").update(`${code}:${phone}:${ACCESS_TOKEN_SECRET}`).digest("hex");

const phoneTakenBy = (db, phone, userId) =>
  db.user.findFirst({
    where: { phone, phone_verified_at: { not: null }, id: { not: userId }, deleted_at: null },
    select: { id: true },
  });

export const sendPhoneOtp = asyncHandler(async (req, res) => {
  const phone = normalizeVnPhone(req.body?.phone);
  if (!phone) {
    return res.status(400).json({ success: false, error: "Invalid Vietnamese phone number" });
  }
  const userId = BigInt(req.user.id);

  if (await phoneTakenBy(prisma, phone, userId)) {
    return res.status(409).json({ success: false, error: "Phone number already verified by another account" });
  }

  const hourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [last, byUser, byPhone] = await Promise.all([
    prisma.otpCode.findFirst({ where: { user_id: userId }, orderBy: { created_at: "desc" } }),
    prisma.otpCode.count({ where: { user_id: userId, created_at: { gte: hourAgo } } }),
    prisma.otpCode.count({ where: { phone, created_at: { gte: hourAgo } } }),
  ]);
  if (last && Date.now() - last.created_at.getTime() < OTP_COOLDOWN_MS) {
    const retry = Math.ceil((OTP_COOLDOWN_MS - (Date.now() - last.created_at.getTime())) / 1000);
    return res.status(429).json({ success: false, error: `Please wait ${retry}s before requesting another code`, retry_after: retry });
  }
  if (byUser >= OTP_MAX_PER_HOUR || byPhone >= OTP_MAX_PER_HOUR) {
    return res.status(429).json({ success: false, error: "Too many codes requested. Try again later." });
  }

  const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, "0");
  await prisma.otpCode.create({
    data: {
      user_id: userId,
      phone,
      code_hash: hashOtp(code, phone),
      expires_at: new Date(Date.now() + OTP_TTL_MS),
    },
  });
  try {
    await sendSms(phone, `Ma xac thuc cua ban la ${code}. Het han sau 5 phut.`);
  } catch (err) {
    console.error("sendSms error:", err?.message || err);
    return res.status(502).json({ success: false, error: "Could not send SMS" });
  }

  res.json({
    success: true,
    message: "Verification code sent",
    data: { phone, expires_in: OTP_TTL_MS / 1000, ...(exposeDevCode() && { dev_code: code }) },
  });
});

export const verifyPhoneOtp = asyncHandler(async (req, res) => {
  const phone = normalizeVnPhone(req.body?.phone);
  const code = String(req.body?.code ?? "").trim();
  if (!phone || !/^\d{6}$/.test(code)) {
    return res.status(400).json({ success: false, error: "Phone and 6-digit code are required" });
  }
  const userId = BigInt(req.user.id);

  const otp = await prisma.otpCode.findFirst({
    where: { user_id: userId, phone, consumed_at: null },
    orderBy: { created_at: "desc" },
  });
  if (!otp || otp.expires_at < new Date()) {
    return res.status(400).json({ success: false, error: "No valid code. Please request a new one." });
  }
  // Tang attempts nguyen tu truoc khi so sanh: request song song khong vuot gioi han.
  const bumped = await prisma.otpCode.updateMany({
    where: { id: otp.id, consumed_at: null, attempts: { lt: OTP_MAX_ATTEMPTS } },
    data: { attempts: { increment: 1 } },
  });
  if (bumped.count === 0) {
    return res.status(429).json({ success: false, error: "Too many attempts. Please request a new code." });
  }

  const a = Buffer.from(hashOtp(code, phone));
  const b = Buffer.from(otp.code_hash);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    return res.status(400).json({ success: false, error: "Incorrect code" });
  }

  const result = await prisma.$transaction(async (tx) => {
    const consumed = await tx.otpCode.updateMany({
      where: { id: otp.id, consumed_at: null },
      data: { consumed_at: new Date() },
    });
    if (consumed.count === 0) return "used";
    if (await phoneTakenBy(tx, phone, userId)) return "taken";
    await tx.user.update({ where: { id: userId }, data: { phone, phone_verified_at: new Date() } });
    return "ok";
  });
  if (result === "taken") {
    return res.status(409).json({ success: false, error: "Phone number already verified by another account" });
  }
  if (result === "used") {
    return res.status(400).json({ success: false, error: "Code already used" });
  }

  writeAuditLog({
    userId: req.user.id,
    action: "VERIFY_PHONE",
    resource: "user",
    resourceId: req.user.id,
    ip: req.ip,
    userAgent: req.headers["user-agent"],
  });
  res.json({ success: true, message: "Phone verified", data: { phone, phone_verified: true } });
});
