// Chay fn khi giu duoc advisory lock phien; instance khac dang giu thi bo qua.
// Lock gan voi connection nen phai mo/khoa tren cung mot transaction.
import { prisma } from "../../lib/db.js";

export const runWithJobLock = async (lockId, name, fn, { timeoutMs = 10 * 60 * 1000 } = {}) => {
  let ran = false;
  await prisma.$transaction(
    async (tx) => {
      const [lock] = await tx.$queryRaw`SELECT pg_try_advisory_xact_lock(${lockId}) AS acquired;`;
      if (!lock?.acquired) {
        console.log(`[${name}] another instance holds the lock, skipping.`);
        return;
      }
      ran = true;
      await fn();
    },
    { timeout: timeoutMs, maxWait: 10_000 }
  );
  return ran;
};

// Bao boc main() chung cho moi script job: log loi, dat exit code, dong ket noi.
export const runJobScript = (name, main) =>
  main()
    .catch((error) => {
      console.error(`[${name}]`, error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
