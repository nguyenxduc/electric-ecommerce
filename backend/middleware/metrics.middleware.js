// Do latency va loi 5xx theo tung route, giu het trong bo nho process.
//
// Middleware nay nam truoc /api/auth va /api/payments, nen no CHI doc
// req.method, req.baseUrl, req.route?.path, res.statusCode va mot moc thoi
// gian. Khong doc req.body, req.query, header hay URL that - mot dong log
// chua URL that o day la du de token reset mat khau hoac query IPN roi vao
// file log.
//
// Khoa duoc dung o res.on("finish") chu khong phai luc vao middleware: luc
// vao, Express chua match route nen req.route con undefined. Doc luc finish
// cho ra MAU route ("/api/products/:id"), khong bao gio la URL co id that.

import { percentile } from "../lib/stats.js";
import { notifyAdmins } from "../lib/notify.js";

// Chan bo nho: toi da 200 khoa route. Het cho thi moi khoa moi gop vao mot
// bucket "(other)" duy nhat (tong cong <= 201 entry), khong de Map lon theo
// luu luong - vi route "(unmatched)" cua scanner co the sinh khoa vo han.
const MAX_ROUTES = 200;
const OTHER_KEY = "(other)";

// Ring buffer co dinh: chi giu 500 mau gan nhat moi route.
const RING = 500;

const ALERT_THROTTLE_MS = 60_000;
const P95_ALERT_MS = Number(process.env.METRICS_P95_ALERT_MS || 500);
const C5XX_ALERT = Number(process.env.METRICS_5XX_ALERT || 5);

const NOTIFY_THROTTLE_MS = Number(
  process.env.METRICS_NOTIFY_THROTTLE_MS || 10 * 60_000
);
let lastNotifyAt = 0;

const routes = new Map();

const bucketFor = (key) => {
  const existing = routes.get(key);
  if (existing) return existing;

  const route = routes.size >= MAX_ROUTES ? OTHER_KEY : key;
  let bucket = routes.get(route);
  if (!bucket) {
    bucket = {
      route,
      latencies: new Array(RING),
      count: 0,
      c5xx: 0,
      lastAlertAt: 0,
      notified: false,
    };
    routes.set(route, bucket);
  }
  return bucket;
};

// Phan da ghi cua ring buffer (truoc khi quay vong, phan con lai la undefined).
const samplesOf = (bucket) =>
  bucket.latencies.slice(0, Math.min(bucket.count, RING));

export const metricsMiddleware = (req, res, next) => {
  const start = Date.now();

  res.on("finish", () => {
    const bucket = bucketFor(
      `${req.method} ${req.baseUrl}${req.route?.path ?? "(unmatched)"}`
    );

    bucket.latencies[bucket.count % RING] = Date.now() - start;
    bucket.count += 1;
    if (res.statusCode >= 500) bucket.c5xx += 1;

    const p95 = percentile(samplesOf(bucket), 95);
    if (p95 <= P95_ALERT_MS && bucket.c5xx < C5XX_ALERT) {
      bucket.notified = false; // ve duoi nguong: lan vuot sau se bao lai
      return;
    }

    // Bat buoc co throttle: khong co no thi mot route cham se log alert o MOI
    // request va canh bao that bi chim trong hang nghin dong giong nhau.
    const now = Date.now();
    if (now - bucket.lastAlertAt < ALERT_THROTTLE_MS) return;
    bucket.lastAlertAt = now;
    const line = `${bucket.route} p95=${p95}ms count=${bucket.count} 5xx=${bucket.c5xx}`;
    console.error(`[metrics] ${line}`);

    // Kenh thu hai: thong bao in-app cho admin. Throttle chung 10 phut cho ca
    // he thong (khong theo route): luc qua tai nhieu route cung vuot nguong,
    // moi route mot thong bao se lam ngap hop thu dung luc can doc nhat.
    // Chi bao khi route VUA vuot nguong: c5xx la bo dem tron doi process, neu
    // bao theo trang thai thi da qua 5 loi la cu 10 phut mot thong bao mai mai.
    if (bucket.notified || now - lastNotifyAt < NOTIFY_THROTTLE_MS) return;
    bucket.notified = true;
    lastNotifyAt = now;
    notifyAdmins({
      title: "Performance alert",
      message: `${line}. See /admin/health.`,
      type: "SYSTEM",
    });
  });

  next();
};

export const snapshot = () => {
  const list = [];
  let errors_5xx_total = 0;

  for (const bucket of routes.values()) {
    const samples = samplesOf(bucket);
    errors_5xx_total += bucket.c5xx;
    list.push({
      route: bucket.route,
      count: bucket.count,
      p50: percentile(samples, 50),
      p95: percentile(samples, 95),
      c5xx: bucket.c5xx,
    });
  }

  return {
    uptime_s: Math.round(process.uptime()),
    routes: list,
    errors_5xx_total,
  };
};
