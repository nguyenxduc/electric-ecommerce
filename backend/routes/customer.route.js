import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import { listCustomers, getCustomer, updateCustomer, deleteCustomer } from "../controllers/customer.controller.js";

const router = express.Router();

router.get("/", protectRoute, adminRoute, listCustomers);
router.get("/:id", protectRoute, adminRoute, getCustomer);
router.patch("/:id", protectRoute, adminRoute, updateCustomer);
router.delete("/:id", protectRoute, adminRoute, deleteCustomer);

export default router;


