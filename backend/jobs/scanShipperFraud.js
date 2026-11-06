/**
 * Quet van don 30 ngay gan nhat -> FraudFlag SHIPPER_SUSPECT (xem
 * services/shipperFraud.service.js). Sau do nho Gemini viet nhan dinh cho cac
 * flag open chua co, toi da SHIPPER_AI_PER_RUN (20) moi lan de gioi han chi phi.
 * Nguong chinh qua settings: shipper_fast_delivery_minutes, shipper_cod_remit_days,
 * shipper_failed_repeat, shipper_area_min_shipments, shipper_area_z, fraud_review_score.
 */
import "dotenv/config";
import { prisma } from "../lib/db.js";
import { getSettingNumber } from "../lib/settings.js";
import { notifyAdmins } from "../lib/notify.js";
import { runWithJobLock, runJobScript } from "./lib/jobLock.js";
import {
  SHIPPER_DEFAULTS,
  SHIPPER_FLAG,
  aiTriage,
  areaAnomalies,
  areaKey,
  evaluateShipment,
  upsertShipperFlag,
} from "../services/shipperFraud.service.js";

const LOCK_ID = 782_026_013;
const WINDOW_DAYS = 30;
const MAX_SHIPMENTS = 20000;
const AI_PER_RUN = Number(process.env.SHIPPER_AI_PER_RUN || 20);

const main = async () => {
  const cfg = {};
  for (const [k, v] of Object.entries(SHIPPER_DEFAULTS)) cfg[k] = await getSettingNumber(k, v);
  const reviewScore = await getSettingNumber("fraud_review_score", 40);

  const shipments = await prisma.shipment.findMany({
    where: { created_at: { gte: new Date(Date.now() - WINDOW_DAYS * 86400000) } },
    orderBy: { created_at: "desc" },
    take: MAX_SHIPMENTS,
    select: {
      id: true,
      carrier: true,
      status: true,
      cod_amount_vnd: true,
      cod_collected_at: true,
      cod_settlement_id: true,
      events: { select: { status: true, occurred_at: true } },
      order: { select: { user_id: true, shipping_address: true } },
    },
  });

  const anomalies = areaAnomalies(
    shipments.map((s) => ({ carrier: s.carrier, status: s.status, area: areaKey(s.carrier, s.order?.shipping_address) })),
    cfg
  );

  let created = 0;
  for (const s of shipments) {
    const r = evaluateShipment(s, cfg);
    const area = areaKey(s.carrier, s.order?.shipping_address);
    const hot = area && ["failed", "returned"].includes(s.status) ? anomalies.get(area) : null;
    if (hot) {
      r.reasons.push("AREA_FAIL_ANOMALY");
      r.score += 30;
      r.facts.area = { key: area, ...hot };
    }
    if (r.score < reviewScore) continue;
    const res = await upsertShipperFlag({ shipmentId: s.id, userId: s.order?.user_id, reasons: r.reasons, facts: r.facts });
    if (res.created) created++;
  }

  // Nhan dinh AI cho flag open chua co (ke ca flag do nguoi mua bao chua nhan hang)
  const pending = (
    await prisma.fraudFlag.findMany({
      where: { type: SHIPPER_FLAG, status: "open" },
      orderBy: { score: "desc" },
      take: 200,
    })
  )
    .filter((f) => !f.details?.ai)
    .slice(0, AI_PER_RUN);
  let triaged = 0;
  for (const f of pending) {
    const s = await prisma.shipment.findUnique({
      where: { id: f.subject_id },
      select: { carrier: true, status: true, cod_amount_vnd: true, events: { orderBy: { occurred_at: "asc" } } },
    });
    if (!s) continue;
    const ai = await aiTriage({ ...s, reasons: f.reasons ?? [], facts: f.details?.facts, buyer_note: f.details?.buyer_note });
    if (!ai) break; // khong co key / Gemini loi: lan sau thu lai
    await prisma.fraudFlag.update({ where: { id: f.id }, data: { details: { ...(f.details ?? {}), ai } } });
    triaged++;
  }

  console.log(
    `[shipper-fraud-scan] ${shipments.length} shipment(s), ${anomalies.size} hot area(s), ${created} new flag(s), ${triaged} AI note(s).`
  );
  if (created > 0) {
    await notifyAdmins({
      title: "Nghi van gian lan van chuyen",
      message: `${created} van don moi bi gan co ${SHIPPER_FLAG}.`,
    });
  }
};

runJobScript("shipper-fraud-scan", () => runWithJobLock(LOCK_ID, "shipper-fraud-scan", main));
