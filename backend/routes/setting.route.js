import { Router } from "express";
import {
  getAllSettings,
  getPublicSettings,
  getSettingByKey,
  upsertSetting,
  updateSetting,
  deleteSetting,
} from "../controllers/setting.controller.js";

const router = Router();

// Public route - get public settings
router.get("/public", getPublicSettings);

// Get single setting by key (public if is_public=true, otherwise requires auth)
router.get("/:key", getSettingByKey);

// Admin routes - require authentication and admin role
router.get("/", getAllSettings);
router.post("/", upsertSetting);
router.put("/:key", updateSetting);
router.delete("/:key", deleteSetting);

export default router;
