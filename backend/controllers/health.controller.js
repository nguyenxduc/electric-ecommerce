import { snapshot } from "../middleware/metrics.middleware.js";
import { aiCallsToday } from "../ai/geminiConfig.js";
import { prisma } from "../lib/db.js";
import { registry } from "../lib/promMetrics.js";

// GET /healthz - liveness cho Kubernetes: process con song la du, khong cham DB
// (DB cham thi kubelet khong nen giet pod, chi rut pod khoi Service qua /readyz).
export const getLiveness = (req, res) => {
  res.json({ status: "ok" });
};

// GET /metrics - dinh dang Prometheus. Nam ngoai /api nen ingress (chi dinh tuyen
// /api, /socket.io va / sang web) khong lo ra ngoai; Prometheus scrape qua Service.
export const getMetrics = async (req, res) => {
  res.set("Content-Type", registry.contentType);
  res.end(await registry.metrics());
};

// GET /readyz - readiness: chi nhan traffic khi query duoc DB.
export const getReadiness = async (req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({ status: "ready" });
  } catch {
    res.status(503).json({ status: "db_unavailable" });
  }
};

// GET /api/health - so lieu van hanh cho admin: latency/loi theo route
// (metrics.middleware.js) + so luot goi Gemini trong ngay (ai/geminiConfig.js).
// Tat ca doc tu bo nho process nen reset moi lan restart backend.
export const getHealth = (req, res) => {
  res.json({
    success: true,
    data: { ...snapshot(), ai_calls_today: aiCallsToday() },
  });
};
