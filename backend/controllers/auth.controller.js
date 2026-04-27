import jwt from "jsonwebtoken";
import bcrypt from "bcryptjs";
import { prisma } from "../lib/db.js";
import cloudinary from "../lib/cloudinary.js";
import nodemailer from "nodemailer";
import { promisify } from "util";
import { writeAuditLog } from "./audit.controller.js";

const generateAccessToken = (userId) => {
  const secret =
    process.env.ACCESS_TOKEN_SECRET ||
    "your-access-token-secret-key-change-in-production";
  return jwt.sign({ userId }, secret, {
    expiresIn: "7d",
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

export const signup = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Signup error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const login = async (req, res) => {
  try {
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
          email_verified: user.email_verified,
        },
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

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

export const getProfile = async (req, res) => {
  try {
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
        address: user.address,
        avatar: user.avatar,
        loyalty_points: user.loyalty_points ?? 0,
        segment: user.segment ?? null,
        createdAt: user.created_at,
        updatedAt: user.updated_at,
      },
    });
  } catch (err) {
    console.error("Get profile error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const updateProfile = async (req, res) => {
  try {
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
        address: updatedUser.address,
        avatar: updatedUser.avatar,
        createdAt: updatedUser.created_at,
        updatedAt: updatedUser.updated_at,
      },
    });
  } catch (err) {
    console.error("Update profile error:", err);
    res.status(500).json({
      success: false,
      error: "Internal server error",
    });
  }
};

export const changePassword = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Change password error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const resendVerification = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Resend verification error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const verifyEmail = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Verify email error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const forgotPassword = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

export const resetPassword = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Reset password error:", err);
    res.status(500).json({ success: false, error: "Internal server error" });
  }
};

// Upload avatar
export const uploadAvatar = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Upload avatar error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to upload avatar",
      details: err.message,
    });
  }
};

// Delete avatar
export const deleteAvatar = async (req, res) => {
  try {
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
  } catch (err) {
    console.error("Delete avatar error:", err);
    res.status(500).json({
      success: false,
      error: "Failed to delete avatar",
      details: err.message,
    });
  }
};
