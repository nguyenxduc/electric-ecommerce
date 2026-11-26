// Metric dang Prometheus cho /metrics (Kubernetes scrape qua ServiceMonitor).
// Nhan `route` la MAU route da gioi han so khoa o metrics.middleware.js (<= 201),
// khong bao gio la URL that, nen so chuoi thoi gian khong phinh theo luu luong.
import client from "prom-client";

export const registry = new client.Registry();
client.collectDefaultMetrics({ register: registry });

export const httpRequestDuration = new client.Histogram({
  name: "http_request_duration_seconds",
  help: "Thoi gian xu ly request HTTP theo method, mau route va lop status",
  labelNames: ["method", "route", "status"],
  buckets: [0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5],
  registers: [registry],
});

// 2xx/3xx/4xx/5xx: du cho SLO, it nhan hon status cu the.
export const statusClass = (code) => `${Math.floor(code / 100)}xx`;
