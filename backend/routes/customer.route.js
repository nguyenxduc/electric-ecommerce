import express from "express";
import { protectRoute, adminRoute } from "../middleware/auth.middleware.js";
import {
  listCustomers,
  getCustomer,
  updateCustomer,
  updateCustomerTier,
  updateCustomerPoints,
  deleteCustomer,
  suspendCustomer,
  unsuspendCustomer,
} from "../controllers/customer.controller.js";

import { registerIdParams } from "../middleware/validateId.middleware.js";

const router = express.Router();
registerIdParams(router);

router.get("/", protectRoute, adminRoute, listCustomers);
router.get("/:id", protectRoute, adminRoute, getCustomer);
router.patch("/:id", protectRoute, adminRoute, updateCustomer);
router.patch("/:id/tier", protectRoute, adminRoute, updateCustomerTier);
router.patch("/:id/points", protectRoute, adminRoute, updateCustomerPoints);
router.patch("/:id/suspend", protectRoute, adminRoute, suspendCustomer);
router.patch("/:id/unsuspend", protectRoute, adminRoute, unsuspendCustomer);
router.delete("/:id", protectRoute, adminRoute, deleteCustomer);

export default router;


