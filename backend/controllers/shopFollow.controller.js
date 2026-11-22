import { asyncHandler } from "../middleware/error.middleware.js";
import { parsePagination, buildPaginationMeta } from "../lib/pagination.js";
import {
  followShop,
  unfollowShop,
  listFollowedShops,
  ShopFollowError,
} from "../services/shopFollow.service.js";

const run = (fn) =>
  asyncHandler(async (req, res) => {
    try {
      return res.json({ success: true, data: await fn(req) });
    } catch (err) {
      if (err instanceof ShopFollowError) {
        return res.status(err.status).json({ success: false, error: err.message });
      }
      throw err;
    }
  });

// POST /api/shops/:slug/follow
export const follow = run((req) => followShop(BigInt(req.user.id), req.params.slug));

// DELETE /api/shops/:slug/follow
export const unfollow = run((req) => unfollowShop(BigInt(req.user.id), req.params.slug));

// GET /api/shops/following/mine
export const myFollowedShops = asyncHandler(async (req, res) => {
  const { currentPage, perPage, skip, take } = parsePagination(
    req.query.page,
    req.query.limit
  );
  const { shops, total } = await listFollowedShops(BigInt(req.user.id), { skip, take });
  return res.json({
    success: true,
    data: { shops, pagination: buildPaginationMeta(currentPage, perPage, total) },
  });
});
