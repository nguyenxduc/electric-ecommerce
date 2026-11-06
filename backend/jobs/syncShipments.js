// Luoi an toan khi webhook van chuyen bi lo: hoi trang thai van don dang di
// (khong cap nhat > 2h) o nha van chuyen co getStatus. Mock khong lam gi.
import "dotenv/config";
import { prisma } from "../lib/db.js";
import { runWithJobLock, runJobScript } from "./lib/jobLock.js";
import { getProvider } from "../services/shipping/providers/index.js";
import { applyShipmentStatus } from "../services/shipping/shipment.service.js";

const LOCK_ID = 782_026_010;
const STALE_MS = 2 * 60 * 60 * 1000;
const POLL_TIMEOUT_MS = 5000;
// Lock giu trong 1 tx nen tx timeout phai > thoi gian lam viec toi da; dung som de lan sau lam tiep.
const LOCK_TIMEOUT_MS = 60 * 60 * 1000;
const MAX_RUN_MS = 8 * 60 * 1000;

const main = () =>
  runWithJobLock(LOCK_ID, "sync-shipments", async () => {
    const stale = await prisma.shipment.findMany({
      where: {
        status: { in: ["created", "picking", "in_transit", "failed"] },
        carrier: { not: "mock" },
        tracking_code: { not: null },
        updated_at: { lt: new Date(Date.now() - STALE_MS) },
      },
      // Cu nhat truoc; loi cung bump updated_at nen khong don mai mot nhom
      orderBy: { updated_at: "asc" },
      take: 200,
    });
    let changed = 0;
    const startedAt = Date.now();
    for (const s of stale) {
      if (Date.now() - startedAt > MAX_RUN_MS) {
        console.log("[sync-shipments] run budget exceeded, remaining shipments next run.");
        break;
      }
      try {
        const provider = getProvider(s.carrier);
        if (!provider?.getStatus) continue;
        const r = await provider.getStatus(s, { timeoutMs: POLL_TIMEOUT_MS });
        if (r.status && (await applyShipmentStatus(s.id, r)).changed) changed++;
        else await prisma.shipment.update({ where: { id: s.id }, data: { updated_at: new Date() } });
      } catch (err) {
        console.error(`[sync-shipments] shipment ${s.id}:`, err.message);
        // Bump de van don loi xuong cuoi hang doi, khong chan van don khac
        await prisma.shipment.update({ where: { id: s.id }, data: { updated_at: new Date() } }).catch(() => {});
      }
    }
    console.log(`[sync-shipments] checked ${stale.length}, changed ${changed}.`);
  }, { timeoutMs: LOCK_TIMEOUT_MS });

runJobScript("sync-shipments", main);
