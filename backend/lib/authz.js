import { ROLES } from "../constants/roles.js";

// Middleware factory: verifies the acting seller owns the specific shop that
// the targeted resource belongs to. Admins bypass the check.
//
// resolveShopId(req) -> BigInt | null: looks up which shop the target
// resource belongs to (e.g. via the product or order in req.params).
// Must run after protectRoute + sellerRoute (relies on req.user / req.shop).
export const requireShopOwnership = (resolveShopId) => async (req, res, next) => {
  try {
    if (req.user?.role === ROLES.ADMIN) {
      return next();
    }

    const targetShopId = await resolveShopId(req);
    if (targetShopId === null || targetShopId === undefined) {
      return res.status(404).json({
        success: false,
        error: "Resource not found",
      });
    }

    if (!req.shop || req.shop.id.toString() !== targetShopId.toString()) {
      return res.status(403).json({
        success: false,
        error: "You do not own this shop's resource",
      });
    }

    next();
  } catch (error) {
    console.error("Error in requireShopOwnership middleware:", error.message);
    return res.status(500).json({
      success: false,
      error: "Authorization check failed",
    });
  }
};
