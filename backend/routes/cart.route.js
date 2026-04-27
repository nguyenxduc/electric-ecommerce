import express from "express";
import {
  addToCart,
  getCartProducts,
  removeAllFromCart,
  updateQuantity,
  deleteCartItem,
} from "../controllers/cart.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Specified routes
router.get("/", protectRoute, getCartProducts);
router.post("/add_item/:product_id", protectRoute, addToCart);
router.put("/update_item/:product_id", protectRoute, updateQuantity);
router.delete("/remove_item/:product_id", protectRoute, deleteCartItem);
router.delete("/clear", protectRoute, removeAllFromCart);

export default router;


