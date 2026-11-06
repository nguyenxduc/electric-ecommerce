/**
 * Do luong chat luong cac tinh nang AI — sinh so lieu cho chuong thuc nghiem.
 *
 *   npm run eval:ai              # chay day du, ghi ra docs/ai-evaluation.md
 *   npm run eval:ai -- --quick   # bo bot cau hoi cho nhanh
 *
 * Yeu cau: backend dang chay va da co embedding (npm run seed:full).
 *
 * Ba phep do:
 *   1. Truy hoi RAG  — chatbot co lay dung san pham lien quan khong
 *   2. Kiem duyet danh gia — ma tran nham lan tren bo binh luan da gan nhan
 *   3. Goi y — do phu va tinh hop le cua ket qua tra ve
 *
 * Moi phep do deu goi Gemini that nen ton quota; con so in ra la do that,
 * khong phai uoc luong.
 */
import "dotenv/config";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prisma } from "../lib/db.js";
import { moderateReviewComment } from "../ai/reviewModeration.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const API = process.env.API_URL || "http://localhost:3000/api";
const QUICK = process.argv.includes("--quick");

const req = async (p, { method = "GET", token, body } = {}) => {
  const res = await fetch(API + p, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token && { Authorization: `Bearer ${token}` }),
    },
    ...(body && { body: JSON.stringify(body) }),
  });
  let json = null;
  try {
    json = await res.json();
  } catch {}
  return { status: res.status, json };
};

const login = async (email) => {
  const r = await req("/auth/login", {
    method: "POST",
    body: { email, password: "password123" },
  });
  const t = r.json?.data?.accessToken;
  if (!t) throw new Error(`Khong dang nhap duoc ${email}. Backend da chay chua?`);
  return t;
};

const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 1000) / 10);
const ms = (n) => `${Math.round(n)}ms`;

const percentile = (arr, p) => {
  if (!arr.length) return 0;
  const s = [...arr].sort((a, b) => a - b);
  return s[Math.min(s.length - 1, Math.floor((p / 100) * s.length))];
};

// Ban mien phi cua Gemini gioi han 15 luot goi moi phut cho moi model. Bo
// danh gia nay goi kha day: moi cau hoi ton 1 luot sinh cau tra loi cong 3
// luot cham diem. Khong gian nhip thi chay duoc vai cau la dinh 429.
const RPM = Number(process.env.EVAL_RPM || 12);
const MIN_GAP_MS = Math.ceil(60000 / RPM);
let lastCallAt = 0;
const pace = async () => {
  const wait = lastCallAt + MIN_GAP_MS - Date.now();
  if (wait > 0) await new Promise((r) => setTimeout(r, wait));
  lastCallAt = Date.now();
};

// ---------------------------------------------------------------------------
// 1. Truy hoi RAG cua chatbot
// ---------------------------------------------------------------------------

// Moi cau hoi kem tu khoa mong doi xuat hien trong ten san pham duoc goi y.
// Danh sach bam theo catalog seed (dien thoai / laptop / tai nghe / dong ho...).
const RAG_QUESTIONS = [
  { q: "Tu van cho toi mot chiec dien thoai chup anh dep", expect: ["iphone", "galaxy", "pixel", "xiaomi"] },
  { q: "Toi can laptop de lam do hoa", expect: ["macbook", "xps", "thinkpad", "laptop", "dell"] },
  { q: "Co tai nghe chong on nao tot khong", expect: ["airpods", "sony", "bose", "wh-", "tai nghe"] },
  { q: "Goi y dong ho thong minh theo doi suc khoe", expect: ["watch", "galaxy watch", "apple watch"] },
  { q: "May tinh bang nao phu hop de hoc online", expect: ["ipad", "tab", "tablet"] },
  { q: "Toi muon mua may anh chup chuyen nghiep", expect: ["canon", "sony", "eos", "camera"] },
  { q: "Ban phim co nao go game tot", expect: ["keyboard", "ban phim", "keychron", "logitech"] },
  { q: "Dien thoai tam gia duoi 500 do la", expect: ["xiaomi", "pixel", "galaxy", "iphone"] },
];

const evaluateRag = async () => {
  const token = await login("john@example.com");
  const questions = QUICK ? RAG_QUESTIONS.slice(0, 3) : RAG_QUESTIONS;
  const rows = [];
  const latencies = [];

  for (const item of questions) {
    const chat = await req("/ai-assistant", {
      method: "POST",
      token,
      body: { title: "danh gia" },
    });
    const chatId = chat.json?.data?.id;
    if (!chatId) {
      rows.push({ ...item, ok: false, cited: false, matched: false, latency: 0, note: "khong tao duoc phien" });
      continue;
    }

    await pace();
    const started = Date.now();
    const res = await req(`/ai-assistant/${chatId}/messages`, {
      method: "POST",
      token,
      body: { content: item.q },
    });
    const latency = Date.now() - started;
    latencies.push(latency);

    const text = String(res.json?.data?.reply ?? "").toLowerCase();
    const cited = /\/product\//.test(text);
    const matched = item.expect.some((k) => text.includes(k.toLowerCase()));

    rows.push({
      ...item,
      ok: res.status === 200,
      cited,
      matched,
      latency,
    });
    process.stdout.write(matched ? "." : "x");
  }
  process.stdout.write("\n");

  const answered = rows.filter((r) => r.ok).length;
  return {
    total: rows.length,
    answered,
    cited: rows.filter((r) => r.cited).length,
    matched: rows.filter((r) => r.matched).length,
    p50: percentile(latencies, 50),
    p95: percentile(latencies, 95),
    rows,
  };
};

// ---------------------------------------------------------------------------
// 2. Kiem duyet danh gia
// ---------------------------------------------------------------------------

// label=true nghia la binh luan SACH (dang le duoc dang).
// Danh sach nay duoc chot MOT LAN va khong sua lai sau khi da xem ket qua,
// de ty le duong tinh gia (false positive) do duoc la do thuc, khong phai
// con so da bi chon loc nguoc.
const MODERATION_SAMPLES = [
  { text: "San pham dung nhu mo ta, giao hang nhanh, dong goi can than.", clean: true },
  { text: "Pin trau, camera dep, dang tien.", clean: true },
  { text: "Hang ok nhung phu kien di kem hoi so sai.", clean: true },
  { text: "Minh dung mot tuan thay on, se ung ho shop lan sau.", clean: true },
  { text: "Gia hoi cao so voi mat bang chung, nhung chat luong tot.", clean: true },
  { text: "May nong khi choi game lau, hoi that vong.", clean: true },
  // Nhom A: khen ngoi thong thuong.
  { text: "Dong goi ky, giao nhanh, rat hai long voi don hang nay.", clean: true },
  { text: "San pham dung y, se tiep tuc mua o shop.", clean: true },
  { text: "Chat luong tot, dung nhu hinh anh quang cao.", clean: true },
  { text: "Nhan vien tu van nhiet tinh, giao hang dung hen.", clean: true },
  { text: "Mau sac dep, cam giac cao cap khi cam tren tay.", clean: true },
  { text: "Mua lan thu hai van ung y nhu lan dau.", clean: true },
  { text: "Shop dong goi cham kinh, khong bi mop mong khi van chuyen.", clean: true },
  { text: "Gia hop ly, chat luong xung dang voi so tien bo ra.", clean: true },
  // Nhom B: cau hoi ky thuat.
  { text: "Sac nhanh toi da bao nhieu W vay shop?", clean: true },
  { text: "May co ho tro NFC khong?", clean: true },
  { text: "Pin dung duoc bao nhieu gio khi xem video lien tuc?", clean: true },
  { text: "San pham nay co chong nuoc chuan IP68 khong?", clean: true },
  { text: "Co ho tro xuat video 4K 60fps khong?", clean: true },
  { text: "Bao hanh chinh hang bao nhieu thang?", clean: true },
  { text: "May co ho tro sac khong day khong?", clean: true },
  { text: "Dung luong RAM toi da nang cap duoc la bao nhieu?", clean: true },
  // Nhom C: than phien trung lap tu nhung khong vi pham — day moi la nhom
  // thuc su kiem tra duong tinh gia.
  { text: "Pin te thuc su, that vong voi san pham nay.", clean: true },
  { text: "Gia nay thi do, khong dang de mua.", clean: true },
  { text: "Chay cham, khong dang tien.", clean: true },
  { text: "Chat luong am thanh qua kem, minh khong hai long.", clean: true },
  { text: "May nong bat thuong, trai nghiem rat khong tot.", clean: true },
  { text: "Man hinh toi, mau sac nhin rat te.", clean: true },
  { text: "Giao hang tre so voi du kien, trai nghiem mua sam khong tot.", clean: true },
  { text: "San pham khong xung voi gia tien, that su that vong.", clean: true },
  { text: "Shop lua dao, do rac ruoi, thang chu shop ngu nhu bo.", clean: false },
  { text: "Do cho de, mua ve vut di cho nhanh, dm shop.", clean: false },
  { text: "LIEN HE 0900xxxx GIAM GIA 90% HANG CHUAN SIEU RE INBOX NGAY", clean: false },
  { text: "Thang ban hang mat day, tao se den tan nha xu ly may.", clean: false },
];

const evaluateModeration = async () => {
  // Che do nhanh phai lay CAN BANG ca hai lop. Cat 6 mau dau se ra toan mau
  // sach, khi do precision/recall/F1 deu bang 0 va con so tro nen vo nghia.
  const clean = MODERATION_SAMPLES.filter((s) => s.clean);
  const toxic = MODERATION_SAMPLES.filter((s) => !s.clean);
  const samples = QUICK
    ? [...clean.slice(0, 3), ...toxic.slice(0, 3)]
    : MODERATION_SAMPLES;
  let tp = 0; // doc hai -> chan dung
  let tn = 0; // sach   -> cho qua dung
  let fp = 0; // sach   -> bi chan oan
  let fn = 0; // doc hai -> lot luoi
  let skipped = 0; // loi goi model (429, timeout...) -> khong tinh vao ma tran
  const rows = [];

  for (const s of samples) {
    // Goi lai toi da 2 lan khi model loi (503/timeout): cung mau, khong doi
    // nhan, nen khong phai chon loc ket qua.
    let verdict;
    for (let attempt = 0; attempt < 3; attempt++) {
      await pace();
      verdict = await moderateReviewComment(s.text);
      if (!verdict?.skipped) break;
    }
    if (verdict?.skipped) {
      skipped++;
      rows.push({ ...s, allowed: verdict?.allowed !== false, labels: verdict?.labels ?? [], skipped: true });
      process.stdout.write("s");
      continue;
    }
    const allowed = verdict?.allowed !== false;
    if (s.clean && allowed) tn++;
    else if (s.clean && !allowed) fp++;
    else if (!s.clean && !allowed) tp++;
    else fn++;
    rows.push({ ...s, allowed, labels: verdict?.labels ?? [] });
    process.stdout.write(s.clean === allowed ? "." : "x");
  }
  process.stdout.write("\n");

  const scored = tp + tn + fp + fn; // mau duoc model cham thuc su (loai skipped)
  const precision = tp + fp === 0 ? 0 : tp / (tp + fp);
  const recall = tp + fn === 0 ? 0 : tp / (tp + fn);
  const f1 = precision + recall === 0 ? 0 : (2 * precision * recall) / (precision + recall);
  const falsePositiveRate = fp + tn === 0 ? 0 : fp / (fp + tn);

  return {
    total: samples.length,
    scored,
    skipped,
    tp, tn, fp, fn,
    accuracy: scored === 0 ? 0 : (tp + tn) / scored,
    precision,
    recall,
    f1,
    falsePositiveRate,
    rows,
  };
};

// ---------------------------------------------------------------------------
// 3. Goi y
// ---------------------------------------------------------------------------

const evaluateRecommendations = async () => {
  const anonymous = await req("/recommendations/home?limit=8");
  const token = await login("john@example.com");
  const personalised = await req("/recommendations/home?limit=8", { token });

  const activeShopIds = new Set(
    (
      await prisma.shop.findMany({
        where: { status: "active", deleted_at: null },
        select: { id: true },
      })
    ).map((s) => s.id.toString())
  );

  const inspect = async (res) => {
    const products = res.json?.data?.products ?? [];
    const ids = products.map((p) => BigInt(p.id));
    const rows = ids.length
      ? await prisma.product.findMany({
          where: { id: { in: ids } },
          select: { id: true, shop_id: true, deleted_at: true },
        })
      : [];
    const fromActive = rows.filter((r) => activeShopIds.has(r.shop_id.toString())).length;
    return {
      count: products.length,
      strategy: res.json?.data?.strategy ?? "(khong ro)",
      fromActiveShops: fromActive,
      leaked: rows.length - fromActive,
      distinct: new Set(products.map((p) => String(p.id))).size,
    };
  };

  const totalProducts = await prisma.product.count({
    where: { deleted_at: null, shop: { status: "active", deleted_at: null } },
  });

  return {
    anonymous: await inspect(anonymous),
    personalised: await inspect(personalised),
    catalogueSize: totalProducts,
  };
};

// ---------------------------------------------------------------------------

const main = async () => {
  console.log(`Danh gia AI — ${QUICK ? "che do nhanh" : "day du"}\n`);

  console.log("1/3  Truy hoi RAG cua chatbot...");
  const rag = await evaluateRag();

  console.log("2/3  Kiem duyet danh gia...");
  const mod = await evaluateModeration();
  if (!QUICK && mod.skipped > 0) {
    throw new Error(
      `${mod.skipped} mau bi skip (loi goi model) trong lan chay day du — ket qua bi pha loang, khong dang tin. Chay lai.`
    );
  }

  console.log("3/3  Goi y san pham...");
  const rec = await evaluateRecommendations();

  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const md = [
    "# Ket qua do luong cac tinh nang AI",
    "",
    `> Sinh tu \`npm run eval:ai\` luc ${now}. Moi con so deu do truc tiep tren`,
    "> he thong dang chay, khong phai uoc luong.",
    "",
    "## 1. Truy hoi RAG cua chatbot tu van",
    "",
    `Bo cau hoi: ${rag.total} cau tieng Viet mo phong cach nguoi mua hoi that.`,
    "Moi cau duoc cham hai tieu chi: cau tra loi co dinh kem link san pham that",
    "khong, va san pham do co dung nhom hang nguoi dung hoi khong.",
    "",
    "| Chi so | Gia tri |",
    "|---|---|",
    `| So cau hoi | ${rag.total} |`,
    `| Tra loi thanh cong | ${rag.answered}/${rag.total} (${pct(rag.answered, rag.total)}%) |`,
    `| Co trich dan san pham | ${rag.cited}/${rag.total} (${pct(rag.cited, rag.total)}%) |`,
    `| Trich dan dung nhom hang | ${rag.matched}/${rag.total} (${pct(rag.matched, rag.total)}%) |`,
    `| Do tre trung vi (p50) | ${ms(rag.p50)} |`,
    `| Do tre p95 | ${ms(rag.p95)} |`,
    "",
    "<details><summary>Chi tiet tung cau hoi</summary>",
    "",
    "| Cau hoi | Trich dan | Dung nhom | Do tre |",
    "|---|---|---|---|",
    ...rag.rows.map(
      (r) =>
        `| ${r.q} | ${r.cited ? "co" : "khong"} | ${r.matched ? "dung" : "sai"} | ${ms(r.latency)} |`
    ),
    "",
    "</details>",
    "",
    "## 2. Kiem duyet danh gia tu dong",
    "",
    `Bo mau: ${mod.total} binh luan da gan nhan thu cong (sach / doc hai), ${mod.scored} duoc model cham (${mod.skipped} bi skip do loi goi model).`,
    'Lop "duong tinh" la binh luan doc hai bi chan.',
    "",
    "| Chi so | Gia tri |",
    "|---|---|",
    `| Do chinh xac (accuracy) | ${(mod.accuracy * 100).toFixed(1)}% |`,
    `| Precision | ${(mod.precision * 100).toFixed(1)}% |`,
    `| Recall | ${(mod.recall * 100).toFixed(1)}% |`,
    `| F1 | ${(mod.f1 * 100).toFixed(1)}% |`,
    `| Ty le duong tinh gia (false positive rate) | ${(mod.falsePositiveRate * 100).toFixed(1)}% (muc tieu < 5%) |`,
    "",
    "Ma tran nham lan:",
    "",
    "| | Du doan: chan | Du doan: cho qua |",
    "|---|---|---|",
    `| **That: doc hai** | ${mod.tp} (dung) | ${mod.fn} (lot luoi) |`,
    `| **That: sach** | ${mod.fp} (chan oan) | ${mod.tn} (dung) |`,
    "",
    "## 3. Goi y san pham",
    "",
    `Danh muc dang ban: ${rec.catalogueSize} san pham thuoc cac gian hang dang hoat dong.`,
    "",
    "| Truong hop | So goi y | Chien luoc | Tu shop active | Bi lot shop khoa | Khong trung lap |",
    "|---|---|---|---|---|---|",
    `| Khach chua dang nhap | ${rec.anonymous.count} | ${rec.anonymous.strategy} | ${rec.anonymous.fromActiveShops} | ${rec.anonymous.leaked} | ${rec.anonymous.distinct}/${rec.anonymous.count} |`,
    `| Da dang nhap | ${rec.personalised.count} | ${rec.personalised.strategy} | ${rec.personalised.fromActiveShops} | ${rec.personalised.leaked} | ${rec.personalised.distinct}/${rec.personalised.count} |`,
    "",
    "Cot **Bi lot shop khoa** phai luon bang 0: san pham cua gian hang bi dinh chi",
    "khong duoc xuat hien trong goi y.",
    "",
  ].join("\n");

  const out = path.join(__dirname, "..", "docs", "ai-evaluation.md");
  fs.writeFileSync(out, md);

  console.log("\n" + "-".repeat(58));
  console.log(`RAG        : trich dan dung nhom ${rag.matched}/${rag.total} (${pct(rag.matched, rag.total)}%), p50 ${ms(rag.p50)}`);
  console.log(`Kiem duyet : accuracy ${(mod.accuracy * 100).toFixed(1)}%, F1 ${(mod.f1 * 100).toFixed(1)}%, FP rate ${(mod.falsePositiveRate * 100).toFixed(1)}% (skip ${mod.skipped})`);
  console.log(`Goi y      : ${rec.personalised.count} muc, lot shop khoa ${rec.personalised.leaked}`);
  console.log("-".repeat(58));
  console.log(`\nDa ghi bao cao: ${path.relative(process.cwd(), out)}`);

  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error("\nDanh gia that bai:", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
