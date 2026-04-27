import express from "express";
import {
  getFilterMetadata,
  syncFilterOptionsFromProducts,
  listFilterOptions,
  getFilterOption,
  createFilterOption,
  updateFilterOption,
  deleteFilterOption,
  listFilterKeys,
  getFilterKey,
  createFilterKey,
  updateFilterKey,
  deleteFilterKey,
} from "../controllers/filter.controller.js";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Public routes
router.get("/", getFilterMetadata);
router.get("/metadata", getFilterMetadata);

// Admin routes for filter options
router.get("/admin", protectRoute, adminRoute, listFilterOptions);
router.get("/admin/:id", protectRoute, adminRoute, getFilterOption);
router.post("/admin", protectRoute, adminRoute, createFilterOption);
router.put("/admin/:id", protectRoute, adminRoute, updateFilterOption);
router.delete("/admin/:id", protectRoute, adminRoute, deleteFilterOption);
router.post("/sync", protectRoute, adminRoute, syncFilterOptionsFromProducts);

// Admin routes for filter keys
router.get("/keys", protectRoute, adminRoute, listFilterKeys);
router.get("/keys/:id", protectRoute, adminRoute, getFilterKey);
router.post("/keys", protectRoute, adminRoute, createFilterKey);
router.put("/keys/:id", protectRoute, adminRoute, updateFilterKey);
router.delete("/keys/:id", protectRoute, adminRoute, deleteFilterKey);

export default router;
