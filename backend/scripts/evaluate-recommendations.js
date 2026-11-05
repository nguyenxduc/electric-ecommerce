// T8: do nDCG@5 cho goi y ca nhan hoa (KPI de cuong: > 0.60).
//
// Du lieu seed that khong co tin hieu dong mua y nghia (cac don seed la
// don 1-san-pham) va khong seed san user_behavior, nen khong the do nDCG
// tren du lieu seed nhu hien trang. Script nay dung mot tap gia lap CO LAP,
// chay qua dung thuat toan CF that (getCfProductsFromBehavior +
// computeProductSimilarity.js), do xong roi DON DEP sach va tinh lai
// product_similarity tu du lieu that con lai - khong de lai du lieu gia
// trong CSDL dev.
//
// Thiet ke: gom 4 nhom san pham cung "gu" (dien thoai, laptop, am thanh,
// gaming) tu dung 20 san pham seed that. Voi moi nhom co k san pham, tao k
// nguoi dung gia lap, moi nguoi "xem" k-1 san pham trong nhom (lich su hanh
// vi) va GIAU san pham con lai lam ground-truth. Mot gio hang "booster" mua
// chung ca nhom day tin hieu dong mua that cho CF hoc. Neu CF goi y dung san
// pham bi giau, do la bang chung thuat toan hoat dong dung, khong phai hoc
// thuoc vi nguoi dung chua he "xem" san pham do.
//
// Yeu cau: da chay "npm run seed".
// Chay: npm run eval:reco

import { execFileSync } from "child_process";
import { prisma } from "../lib/db.js";
import { getCfProductsFromBehavior } from "../jobs/computeUserRecommendations.js";

const MARKER = "NDCG_EVAL";
const EMAIL_DOMAIN = "ndcg-eval.local";

const CLUSTERS = {
  phones: ["Galaxy S24 Ultra", "iPhone 15 Pro Max", "Google Pixel 8 Pro", "Xiaomi 14"],
  laptops: ["MacBook Pro 16", "Dell XPS 15", "ASUS ROG Strix G16"],
  audio: ["Sony WH-1000XM5", "AirPods Pro 2", "Samsung Galaxy Buds3 Pro"],
  gaming: ["PlayStation 5", "Xbox Series X", "Nintendo Switch OLED"],
};

const dcgAt = (rank) => (rank > 0 ? 1 / Math.log2(rank + 1) : 0); // IDCG = 1 (1 muc tieu duy nhat o hang 1)

async function resolveClusterProducts() {
  const names = Object.values(CLUSTERS).flat();
  const rows = await prisma.product.findMany({
    where: { deleted_at: null, name: { in: names } },
    select: { id: true, name: true, shop_id: true },
  });
  const byName = new Map(rows.map((r) => [r.name, r]));
  const resolved = {};
  for (const [cluster, productNames] of Object.entries(CLUSTERS)) {
    const items = productNames.map((n) => byName.get(n)).filter(Boolean);
    if (items.length !== productNames.length) {
      throw new Error(
        `Thieu san pham cho nhom "${cluster}" - co the du lieu seed da doi ten.`
      );
    }
    resolved[cluster] = items;
  }
  return resolved;
}

async function cleanupSynthetic() {
  const users = await prisma.user.findMany({
    where: { segment: MARKER },
    select: { id: true },
  });
  const userIds = users.map((u) => u.id);
  if (userIds.length === 0) return 0;

  const orders = await prisma.order.findMany({
    where: { user_id: { in: userIds } },
    select: { id: true },
  });
  const orderIds = orders.map((o) => o.id);
  const groups = await prisma.orderGroup.findMany({
    where: { user_id: { in: userIds } },
    select: { id: true },
  });
  const groupIds = groups.map((g) => g.id);

  await prisma.orderItem.deleteMany({ where: { order_id: { in: orderIds } } });
  await prisma.order.deleteMany({ where: { id: { in: orderIds } } });
  await prisma.orderGroup.deleteMany({ where: { id: { in: groupIds } } });
  await prisma.userBehavior.deleteMany({ where: { user_id: { in: userIds } } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
  return userIds.length;
}

async function createUser(tag) {
  return prisma.user.create({
    data: {
      name: `NDCG Eval ${tag}`,
      email: `${tag}@${EMAIL_DOMAIN}`,
      role: "user",
      segment: MARKER,
    },
  });
}

async function createBasket(user, items) {
  const shopId = items[0].shop_id;
  const total = items.length * 100;
  const group = await prisma.orderGroup.create({
    data: {
      user_id: user.id,
      group_number: `NDCGEVAL-${user.id}-${Date.now()}`,
      subtotal_amount: total,
      total_amount: total,
    },
  });
  const order = await prisma.order.create({
    data: {
      user_id: user.id,
      shop_id: shopId,
      order_group_id: group.id,
      order_number: `NDCGEVAL-O-${user.id}-${Date.now()}`,
      total_amount: total,
      status: "delivered",
    },
  });
  for (const item of items) {
    await prisma.orderItem.create({
      data: {
        order_id: order.id,
        product_id: item.id,
        quantity: 1,
        unit_price: 100,
        total_price: 100,
      },
    });
  }
}

const runComputeSimilarity = () =>
  execFileSync("node", ["jobs/computeProductSimilarity.js"], {
    cwd: process.cwd(),
    stdio: "pipe",
  });

async function main() {
  console.log("Don dep du lieu gia lap con sot tu lan chay truoc (neu co)...");
  await cleanupSynthetic();

  const clusters = await resolveClusterProducts();

  // computeProductSimilarity tinh tren TOAN BO don, nen don do test tao ra (mua
  // ngau nhien) lam nhieu tin hieu dong mua: do 2026-11-05, ngay sau seed:full
  // nDCG 0.660, sau npm test (them 20 don) con 0.568.
  // shortcut: coi don tao sau khi seed 10 phut la don ngoai seed, sai neu seed
  // chay qua 10 phut hoac du lieu that; doi sang danh dau don seed neu can.
  const firstProduct = await prisma.product.aggregate({ _min: { created_at: true } });
  const seededAt = firstProduct._min.created_at;
  const foreignOrders = seededAt
    ? await prisma.order.count({
        where: { created_at: { gt: new Date(seededAt.getTime() + 10 * 60_000) } },
      })
    : 0;
  if (foreignOrders > 0) {
    console.warn(
      `[!] Co ${foreignOrders} don tao sau khi seed (vd. do npm test). nDCG se bi nhieu;` +
        " chay npm run seed:full truoc khi do."
    );
  }

  console.log("Dung du lieu gia lap: tao nguoi dung, hanh vi, gio hang booster...");
  const cases = []; // { personaId, clusterName, heldOutId, heldOutName }

  for (const [clusterName, items] of Object.entries(clusters)) {
    // Booster: mot gio hang mua chung ca nhom, day tin hieu dong mua cho CF.
    const booster = await createUser(`booster-${clusterName}`);
    await createBasket(booster, items);

    // Mot persona cho moi san pham trong nhom (giau chinh san pham do).
    for (let i = 0; i < items.length; i++) {
      const heldOut = items[i];
      const training = items.filter((_, idx) => idx !== i);
      const persona = await createUser(`persona-${clusterName}-${i}`);
      for (const item of training) {
        await prisma.userBehavior.create({
          data: { user_id: persona.id, product_id: item.id, event_type: "view" },
        });
      }
      cases.push({
        userId: persona.id,
        clusterName,
        heldOutId: heldOut.id.toString(),
        heldOutName: heldOut.name,
      });
    }
  }

  console.log("Tinh lai product_similarity tu du lieu (that + gia lap)...");
  runComputeSimilarity();

  console.log(`Do nDCG@5 tren ${cases.length} ca...`);
  const rows = [];
  for (const c of cases) {
    const recs = await getCfProductsFromBehavior(c.userId, 5);
    const rank = recs.findIndex((p) => p.id.toString() === c.heldOutId) + 1; // 0 neu khong thay
    const ndcg = dcgAt(rank);
    rows.push({ ...c, rank, ndcg });
    process.stdout.write(rank > 0 ? "." : "x");
  }
  process.stdout.write("\n\n");

  console.log("Don dep du lieu gia lap va tinh lai product_similarity tu du lieu that...");
  await cleanupSynthetic();
  runComputeSimilarity();

  const avgNdcg = rows.reduce((s, r) => s + r.ndcg, 0) / rows.length;
  console.log("-".repeat(60));
  console.log(`nDCG@5 trung binh: ${avgNdcg.toFixed(3)}  [muc tieu > 0.60]`);
  console.log("-".repeat(60));

  const misses = rows.filter((r) => r.rank === 0);
  if (misses.length > 0) {
    console.log("\nCac ca khong goi y ra san pham bi giau:");
    misses.forEach((r) =>
      console.log(`  - nhom ${r.clusterName}, giau "${r.heldOutName}"`)
    );
  }

  await prisma.$disconnect();
  process.exit(avgNdcg >= 0.6 ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  try {
    await cleanupSynthetic();
    runComputeSimilarity();
  } catch {}
  await prisma.$disconnect();
  process.exit(1);
});
