/**
 * Offline job: item–item collaborative filtering from order co-purchase.
 * Run: node backend/jobs/computeProductSimilarity.js
 *
 * Tần suất đề xuất: KHÔNG realtime — chạy theo lịch (vd. mỗi đêm 2h sau khi đóng ca bán,
 * hoặc 1 lần/ngày khi dữ liệu đơn ổn định). API recommendation đọc bảng đã precompute;
 * chỉ chạy lại job khi cần làm mới độ tương đồng sau khối lượng đơn mới đáng kể.
 */
import { prisma } from "../lib/db.js";

const TOP_K = 20;
const MIN_COPURCHASE = 1;

async function main() {
  console.log("[CF] Building co-purchase matrix from order items...");

  const orderItems = await prisma.orderItem.findMany({
    where: { deleted_at: null },
    select: {
      order_id: true,
      product_id: true,
    },
  });

  const byOrder = new Map();
  for (const row of orderItems) {
    const oid = row.order_id.toString();
    if (!byOrder.has(oid)) byOrder.set(oid, []);
    byOrder.get(oid).push(row.product_id);
  }

  const pairCounts = new Map();
  const productFreq = new Map();

  for (const [, products] of byOrder) {
    const uniq = [...new Set(products.map((p) => p.toString()))].map((id) =>
      BigInt(id)
    );
    for (const pid of uniq) {
      productFreq.set(
        pid.toString(),
        (productFreq.get(pid.toString()) || 0) + 1
      );
    }
    for (let i = 0; i < uniq.length; i++) {
      for (let j = i + 1; j < uniq.length; j++) {
        const a = uniq[i].toString();
        const b = uniq[j].toString();
        const key = a < b ? `${a}:${b}` : `${b}:${a}`;
        pairCounts.set(key, (pairCounts.get(key) || 0) + 1);
      }
    }
  }

  const neighbors = new Map();

  for (const [key, c] of pairCounts) {
    if (c < MIN_COPURCHASE) continue;
    const [a, b] = key.split(":");
    const fa = productFreq.get(a) || 1;
    const fb = productFreq.get(b) || 1;
    const score = c / Math.sqrt(fa * fb);

    if (!neighbors.has(a)) neighbors.set(a, []);
    if (!neighbors.has(b)) neighbors.set(b, []);
    neighbors.get(a).push({ id: b, score });
    neighbors.get(b).push({ id: a, score });
  }

  for (const [, list] of neighbors) {
    list.sort((x, y) => y.score - x.score);
  }

  console.log("[CF] Clearing product_similarity...");

  await prisma.productSimilarity.deleteMany({});

  const rows = [];
  for (const [pidStr, list] of neighbors) {
    const top = list.slice(0, TOP_K);
    for (const { id: other, score } of top) {
      rows.push({
        product_id: BigInt(pidStr),
        similar_product_id: BigInt(other),
        score,
      });
    }
  }

  const chunk = 500;
  for (let i = 0; i < rows.length; i += chunk) {
    const part = rows.slice(i, i + chunk);
    await prisma.productSimilarity.createMany({
      data: part,
      skipDuplicates: true,
    });
  }

  console.log(`[CF] Done. Stored ${rows.length} similarity rows.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
