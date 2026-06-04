/**
 * One-off: align tier-upgrade voucher min_order with shop currency (USD).
 * Run: node scripts/fix-tier-voucher-min-order.js
 */
import "dotenv/config";
import { prisma } from "../lib/db.js";
import { UPGRADE_VOUCHERS } from "../controllers/loyalty.controller.js";

const TIER_KEYS = ["SILVER", "GOLD", "PLATINUM"];

async function main() {
  let updated = 0;
  for (const tierKey of TIER_KEYS) {
    const cfg = UPGRADE_VOUCHERS[tierKey];
    if (!cfg) continue;
    const result = await prisma.coupon.updateMany({
      where: {
        code: { startsWith: `UP-${tierKey}-` },
        deleted_at: null,
      },
      data: {
        min_order: cfg.min_order,
        discount_value: cfg.discount_value,
        discount_type: cfg.discount_type,
      },
    });
    updated += result.count;
  }
  console.log(`Updated ${updated} tier-upgrade voucher(s).`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
