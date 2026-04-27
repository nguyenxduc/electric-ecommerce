import express from "express";
import {
  login,
  logout,
  signup,
  getProfile,
  updateProfile,
  changePassword,
  uploadAvatar,
  deleteAvatar,
  resendVerification,
  verifyEmail,
  forgotPassword,
  resetPassword,
} from "../controllers/auth.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { uploadMemory } from "../middleware/upload.middleware.js";

const router = express.Router();

// Spec aliases
router.post("/register", signup);
router.post("/signup", signup);
router.post("/login", login);
router.post("/logout", logout);
router.post("/resend-verification", resendVerification);
router.post("/verify-email", verifyEmail);
router.post("/forgot-password", forgotPassword);
router.post("/reset-password", resetPassword);
router.get("/me", protectRoute, getProfile);
router.patch("/update_profile", protectRoute, updateProfile);
router.post("/change_password", protectRoute, changePassword);
router.post("/avatar", protectRoute, uploadMemory.single("avatar"), uploadAvatar);
router.delete("/avatar", protectRoute, deleteAvatar);

export default router;
