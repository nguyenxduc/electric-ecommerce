import express from "express";
import {
  getUserWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from "../controllers/wishlist.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

router.get("/", protectRoute, getUserWishlist);
router.post("/add", protectRoute, addToWishlist);
router.delete("/remove/:productId", protectRoute, removeFromWishlist);
router.delete("/clear", protectRoute, clearWishlist);

export default router;


