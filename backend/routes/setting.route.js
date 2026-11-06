import { Router } from "express";
import {
  getAllSettings,
  getPublicSettings,
  getSettingByKey,
  upsertSetting,
  updateSetting,
  deleteSetting,
} from "../controllers/setting.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = Router();

// Public route - get public settings
router.get("/public", getPublicSettings);

// Get single setting by key (public if is_public=true, otherwise requires auth)
router.get("/:key", getSettingByKey);

// Admin routes - require authentication and admin role
router.get("/", protectRoute, adminRoute, getAllSettings);
router.post("/", protectRoute, adminRoute, upsertSetting);
router.put("/:key", protectRoute, adminRoute, updateSetting);
router.delete("/:key", protectRoute, adminRoute, deleteSetting);

export default router;
