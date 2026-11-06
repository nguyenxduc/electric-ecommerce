// T8: do "Ty le nhan dien dung dong may hoac thuong hieu" cua module tim
// kiem bang hinh anh (KPI de cuong: > 70%).
//
// Khong can bo du lieu gan nhan rieng: moi san pham seed co >=2 anh that tu
// nhieu CDN khac nhau (Apple/Samsung/Amazon/Best Buy...). Dung anh thu hai
// trong thu vien lam "anh nguoi dung tai len", nhan dung la chinh san pham
// do - khong can gan nhan tay, khong can tai anh tu nguon ngoai.
//
// Yeu cau: server dang chay (POST that qua HTTP, giong quy uoc test HTTP cua
// repo), da chay "npm run seed".
//
// Chay: npm run eval:image

import { prisma } from "../lib/db.js";

const API_BASE = process.env.API_BASE_URL || "http://localhost:3000/api";
const QUERY_IMAGE_INDEX = 1; // anh thu hai trong img[], khong dung anh dau

const guessMime = (contentType, url) => {
  if (contentType && contentType.startsWith("image/")) return contentType;
  if (/\.png(\?|$)/i.test(url)) return "image/png";
  if (/\.webp(\?|$)/i.test(url)) return "image/webp";
  return "image/jpeg";
};

const searchByImage = async (imageUrl) => {
  const imgRes = await fetch(imageUrl);
  if (!imgRes.ok) throw new Error(`tai anh loi ${imgRes.status}: ${imageUrl}`);
  const buffer = Buffer.from(await imgRes.arrayBuffer());
  const mimeType = guessMime(imgRes.headers.get("content-type"), imageUrl);

  const form = new FormData();
  form.append("image", new Blob([buffer], { type: mimeType }), "query.jpg");

  const res = await fetch(`${API_BASE}/products/search-by-image`, {
    method: "POST",
    body: form,
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body?.message || `HTTP ${res.status}`);
  }
  return body.data;
};

async function main() {
  const products = await prisma.product.findMany({
    where: { deleted_at: null },
    select: { id: true, name: true, img: true },
  });
  const cases = products.filter(
    (p) => Array.isArray(p.img) && p.img.length > QUERY_IMAGE_INDEX
  );

  if (cases.length === 0) {
    console.log("Khong co san pham nao du >= 2 anh de chay eval nay.");
    await prisma.$disconnect();
    return;
  }

  console.log(`Chay tren ${cases.length} san pham (moi san pham 1 anh thu hai trong thu vien)...`);

  const rows = [];
  for (const p of cases) {
    const imageUrl = p.img[QUERY_IMAGE_INDEX];
    try {
      const data = await searchByImage(imageUrl);
      const found = (data.products || []).some(
        (r) => String(r.id) === String(p.id)
      );
      rows.push({
        id: p.id.toString(),
        name: p.name,
        found,
        matchMode: data.match_mode,
        detectedBrand: data.detected?.brand || "",
        detectedModel: data.detected?.line_or_model || "",
      });
      process.stdout.write(found ? "." : "x");
    } catch (err) {
      rows.push({ id: p.id.toString(), name: p.name, found: false, error: err.message });
      process.stdout.write("E");
    }
  }
  process.stdout.write("\n\n");

  const hits = rows.filter((r) => r.found).length;
  const accuracy = Math.round((hits / rows.length) * 1000) / 10;

  console.log("-".repeat(60));
  console.log(`Nhan dien dung: ${hits}/${rows.length} (${accuracy}%)  [muc tieu > 70%]`);
  console.log("-".repeat(60));

  const misses = rows.filter((r) => !r.found);
  if (misses.length > 0) {
    console.log("\nCac ca sai/loi:");
    misses.forEach((r) =>
      console.log(
        `  - ${r.name} (id=${r.id}): ${
          r.error ? "loi: " + r.error : `match_mode=${r.matchMode}, detected="${r.detectedBrand} ${r.detectedModel}"`
        }`
      )
    );
  }

  await prisma.$disconnect();
  process.exit(hits / rows.length >= 0.7 ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
