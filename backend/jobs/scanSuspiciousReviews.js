/**
 * Quet review nghi van -> FraudFlag REVIEW_SUSPECT (upsert, khong tao trung).
 *  - DUPLICATE_COMMENT: cung noi dung (sau chuan hoa, >= 20 ky tu) tu >= 2 user tren cung san pham/shop.
 *  - SHARED_DEVICE: >= 2 user cung device_id review cung san pham trong 7 ngay (IP chung chi cong diem).
 *  - OWNER_REVIEW: SDT nguoi review == SDT chu shop cua san pham.
 * shortcut: "gan giong" = trung sau khi bo dau/ky tu la; chua do tuong tu mo, nang cap khi that su can.
 */
import "dotenv/config";
import { prisma } from "../lib/db.js";
import { runWithJobLock, runJobScript } from "./lib/jobLock.js";
import { phoneKey } from "../services/fraud.service.js";
import { notifyAdmins } from "../lib/notify.js";

const LOCK_ID = 782_026_012;
const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const MAX_REVIEWS = 20000;

const textKey = (s) =>
  String(s ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

const groupBy = (rows, keyFn) => {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (k == null) continue;
    if (!m.has(k)) m.set(k, []);
    m.get(k).push(r);
  }
  return m;
};

const main = async () => {
  const reviews = await prisma.review.findMany({
    where: { deleted_at: null },
    orderBy: { created_at: "desc" },
    take: MAX_REVIEWS,
    select: {
      id: true,
      user_id: true,
      product_id: true,
      comment: true,
      client_ip: true,
      device_id: true,
      created_at: true,
      user: { select: { phone: true } },
      product: { select: { shop_id: true, shop: { select: { owner: { select: { phone: true } } } } } },
    },
  });

  const found = new Map(); // review id -> { score, reasons:Set }
  const add = (id, reason, score) => {
    const f = found.get(id) || { score: 0, reasons: new Set() };
    if (!f.reasons.has(reason)) {
      f.reasons.add(reason);
      f.score += score;
    }
    found.set(id, f);
  };
  const distinctUsers = (rs) => new Set(rs.map((r) => String(r.user_id))).size;

  for (const scope of [(r) => `p${r.product_id}`, (r) => `s${r.product?.shop_id}`]) {
    const groups = groupBy(reviews, (r) => {
      const t = textKey(r.comment);
      return t.length >= 20 ? `${scope(r)}|${t}` : null;
    });
    for (const rs of groups.values()) {
      if (distinctUsers(rs) >= 2) rs.forEach((r) => add(r.id, "DUPLICATE_COMMENT", 60));
    }
  }

  const byDevice = groupBy(reviews, (r) => (r.device_id ? `${r.product_id}|${r.device_id}` : null));
  for (const rs of byDevice.values()) {
    for (const a of rs) {
      const mates = rs.filter(
        (b) => b.user_id !== a.user_id && Math.abs(a.created_at - b.created_at) <= WEEK_MS
      );
      if (mates.length === 0) continue;
      add(a.id, "SHARED_DEVICE", 60);
      if (a.client_ip && mates.some((b) => b.client_ip === a.client_ip)) add(a.id, "SHARED_IP", 10);
    }
  }

  for (const r of reviews) {
    const mine = phoneKey(r.user?.phone);
    if (mine && mine === phoneKey(r.product?.shop?.owner?.phone)) add(r.id, "OWNER_REVIEW", 80);
  }

  const byId = new Map(reviews.map((r) => [r.id, r]));
  let created = 0;
  for (const [id, f] of found) {
    const where = { type_subject_subject_id: { type: "REVIEW_SUSPECT", subject: "review", subject_id: id } };
    if (await prisma.fraudFlag.findUnique({ where, select: { id: true } })) continue;
    await prisma.fraudFlag.upsert({
      where,
      update: {},
      create: {
        type: "REVIEW_SUSPECT",
        subject: "review",
        subject_id: id,
        user_id: byId.get(id)?.user_id ?? null,
        score: f.score,
        reasons: [...f.reasons],
      },
    });
    created++;
  }
  console.log(`[fraud-review-scan] scanned ${reviews.length} reviews, ${created} new flag(s).`);
  if (created > 0) {
    await notifyAdmins({
      title: "Review nghi van moi",
      message: `${created} review moi bi gan co REVIEW_SUSPECT.`,
    });
  }
};

runJobScript("fraud-review-scan", () => runWithJobLock(LOCK_ID, "fraud-review-scan", main));
