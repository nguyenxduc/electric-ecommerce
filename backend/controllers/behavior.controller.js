import { prisma } from "../lib/db.js";

/**
 * user_behavior: bảng append-only, dễ phình to.
 *
 * Đã triển khai: job `npm run job:prune-user-behavior` (jobs/pruneUserBehavior.js)
 * xóa bản ghi có event_time cũ hơn USER_BEHAVIOR_RETENTION_DAYS (mặc định 90, tối thiểu 7).
 * Nên gắn cron máy chủ / CI (vd. 0 3 * * *) cùng lúc với job CF.
 *
 * Rollup: job `npm run job:rollup-user-behavior-daily` gom raw theo ngày (UTC) vào
 * bảng `user_behavior_daily` (visitor_key + product_id + event_type + day).
 * Được gọi trong `npm run job:daily-recommendation` trước khi prune.
 *
 * Mở rộng sau: partition bảng raw theo tháng trên PostgreSQL.
 */
const ALLOWED_EVENTS = new Set([
  "view",
  "click",
  "add_to_cart",
  "remove_from_cart",
  "purchase",
  "wishlist_add",
  "wishlist_remove",
  "search",
]);

/**
 * Batch ingest behavior events (recommendation / analytics).
 * Body: { session_id?: string, events: [{ event_type, product_id?, metadata? }] }
 */
export const ingestBehaviorEvents = async (req, res) => {
  try {
    const { events, session_id } = req.body || {};
    if (!Array.isArray(events) || events.length === 0) {
      return res.status(400).json({
        success: false,
        error: "events phải là mảng không rỗng",
      });
    }

    const sid = session_id
      ? String(session_id).slice(0, 64)
      : req.headers["x-session-id"]
        ? String(req.headers["x-session-id"]).slice(0, 64)
        : null;

    const userId = req.user?.id ? BigInt(req.user.id) : null;
    const maxBatch = 50;
    const slice = events.slice(0, maxBatch);

    const rows = [];
    for (const ev of slice) {
      const event_type = String(ev.event_type || "").trim();
      if (!ALLOWED_EVENTS.has(event_type)) continue;

      let product_id = null;
      if (ev.product_id != null && ev.product_id !== "") {
        try {
          product_id = BigInt(ev.product_id);
        } catch {
          continue;
        }
      }

      rows.push({
        user_id: userId,
        session_id: sid,
        product_id,
        event_type,
        metadata:
          ev.metadata && typeof ev.metadata === "object"
            ? ev.metadata
            : ev.metadata
              ? { value: ev.metadata }
              : {},
      });
    }

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        error: "Không có sự kiện hợp lệ",
      });
    }

    await prisma.userBehavior.createMany({
      data: rows,
    });

    return res.status(201).json({
      success: true,
      data: { inserted: rows.length },
    });
  } catch (error) {
    console.error("ingestBehaviorEvents error:", error);
    return res.status(500).json({
      success: false,
      error: "Không thể ghi nhận hành vi",
    });
  }
};
