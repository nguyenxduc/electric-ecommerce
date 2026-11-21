import express from "express";
import {
  listAddresses,
  createAddress,
  updateAddress,
  deleteAddress,
  setDefaultAddress,
} from "../controllers/address.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";
import { registerIdParams } from "../middleware/validateId.middleware.js";

// So dia chi cua nguoi mua; moi thao tac chi tren dia chi cua chinh req.user
const router = express.Router();
registerIdParams(router);

router.get("/", protectRoute, listAddresses);
router.post("/", protectRoute, createAddress);
router.patch("/:id", protectRoute, updateAddress);
router.delete("/:id", protectRoute, deleteAddress);
router.post("/:id/default", protectRoute, setDefaultAddress);

export default router;
