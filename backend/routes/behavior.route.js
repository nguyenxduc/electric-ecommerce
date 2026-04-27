import express from "express";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";
import { ingestBehaviorEvents } from "../controllers/behavior.controller.js";

const router = express.Router();

router.post("/events", optionalAuth, ingestBehaviorEvents);

export default router;
