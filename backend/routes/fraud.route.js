import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { registerIdParams } from "../middleware/validateId.middleware.js";
import { listFlags, resolveFlag, fraudStats } from "../controllers/fraud.controller.js";

const router = express.Router();
registerIdParams(router);

router.use(protectRoute, adminRoute);
router.get("/flags", listFlags);
router.get("/stats", fraudStats);
router.patch("/flags/:id", resolveFlag);

export default router;
