// Khung do chat luong he truy hoi tang cuong sinh (RAG).
//
// Do hai nhom chi so tach biet nhau:
//
//   A. Truy hoi  - Recall@5 va MRR tren tap du lieu gan nhan tay o
//      eval/dataset.json. Day la phep do khach quan, khong dung LLM cham diem,
//      nen lap lai bao nhieu lan cung ra cung mot con so.
//
//   B. Sinh cau tra loi - bo ba RAG Triad theo phuong phap cua Ragas:
//        Faithfulness      : cau tra loi co bam vao ngu canh truy hoi duoc khong
//        Answer Relevance  : cau tra loi co dung trong tam cau hoi khong
//        Context Relevance : ngu canh lay ve co lien quan den cau hoi khong
//      Ba chi so nay cham bang LLM-as-judge. Thu vien Ragas goc viet bang
//      Python; o day hien thuc lai cong thuc bang JavaScript de khong phai
//      keo them mot runtime nua vao du an. Dinh nghia va cach cham giu nguyen
//      theo Ragas.
//
// Chay:  npm run eval:rag        (day du)
//        npm run eval:rag -- --quick   (rut gon, do nhanh khi dang sua code)

import "./_disable-rank-cache.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { prisma } from "../lib/db.js";
import { retrieveHybrid } from "../ai/retrieval.js";
import { createGeminiChatModel, hasGeminiApiKey } from "../ai/geminiConfig.js";
import { GoogleGenerativeAIEmbeddings } from "@langchain/google-genai";
import { HumanMessage, SystemMessage } from "@langchain/core/messages";
import { normalizeText } from "../lib/vietnamese.js";
import { GEMINI_API_KEY } from "../ai/geminiConfig.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const QUICK = process.argv.includes("--quick");
const TOP_K = 5;

const dataset = JSON.parse(
  fs.readFileSync(path.join(__dirname, "..", "eval", "dataset.json"), "utf8")
);

const embeddings = GEMINI_API_KEY
  ? new GoogleGenerativeAIEmbeddings({
      model: process.env.GEMINI_EMBED_MODEL || "gemini-embedding-001",
      apiKey: GEMINI_API_KEY,
    })
  : null;

const pct = (a, b) => (b === 0 ? 0 : Math.round((a / b) * 1000) / 10);
const avg = (arr) =>
  arr.length === 0 ? 0 : arr.reduce((s, n) => s + n, 0) / arr.length;
const round3 = (n) => Math.round(n * 1000) / 1000;
const fmtMs = (v) => (v == null ? "n/a" : v + "ms");

/** So khop ten san pham theo dang da bo dau, tranh phu thuoc vao id sau seed. */
const nameMatches = (actual, expected) => {
  const a = normalizeText(actual);
  const b = normalizeText(expected);
  return a === b || a.includes(b) || b.includes(a);
};

// ---------------------------------------------------------------------------
// A. Do truy hoi: Recall@5 va MRR
// ---------------------------------------------------------------------------

const evaluateRetrieval = async () => {
  const questions = QUICK ? dataset.questions.slice(0, 8) : dataset.questions;
  const rows = [];

  for (const item of questions) {
    const retrieved = await retrieveHybrid(prisma, item.q, {
      topK: TOP_K,
      embedQuery: embeddings ? (t) => embeddings.embedQuery(t) : null,
      onError: () => {},
    });

    // Thu hang cua ket qua dung dau tien, dung cho MRR.
    let firstHit = 0;
    retrieved.forEach((r, idx) => {
      if (firstHit === 0 && item.expect.some((e) => nameMatches(r.name, e))) {
        firstHit = idx + 1;
      }
    });

    rows.push({
      q: item.q,
      loai: item.loai,
      expect: item.expect,
      got: retrieved.map((r) => r.name),
      sources: retrieved[0]?._sources ?? [],
      hit: firstHit > 0,
      rank: firstHit,
      rr: firstHit > 0 ? 1 / firstHit : 0,
    });
    process.stdout.write(firstHit > 0 ? "." : "x");
  }
  process.stdout.write("\n");

  const byType = {};
  for (const r of rows) {
    byType[r.loai] = byType[r.loai] || { total: 0, hit: 0 };
    byType[r.loai].total += 1;
    if (r.hit) byType[r.loai].hit += 1;
  }

  return {
    total: rows.length,
    hits: rows.filter((r) => r.hit).length,
    recallAt5: pct(rows.filter((r) => r.hit).length, rows.length),
    mrr: round3(avg(rows.map((r) => r.rr))),
    byType,
    rows,
  };
};

// ---------------------------------------------------------------------------
// B. RAG Triad theo phuong phap Ragas
// ---------------------------------------------------------------------------

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

const judgeModel = () =>
  createGeminiChatModel({ temperature: 0, maxRetries: 1 });

const parseScore = (raw) => {
  const text = Array.isArray(raw) ? raw.join(" ") : String(raw ?? "");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    const score = Number(obj.score);
    return Number.isFinite(score)
      ? { score: Math.max(0, Math.min(1, score)), reason: String(obj.reason || "") }
      : null;
  } catch {
    return null;
  }
};

const judge = async (systemPrompt, userPrompt) => {
  await pace();
  const res = await judgeModel().invoke([
    new SystemMessage(
      systemPrompt +
        ' Chi tra ve JSON dang {"score": 0.0-1.0, "reason": "ngan gon"}. Khong markdown, khong giai thich them.'
    ),
    new HumanMessage(userPrompt),
  ]);
  return parseScore(res?.content);
};

/**
 * Faithfulness - ti le nhan dinh trong cau tra loi duoc ngu canh chong lung.
 * Day la chi so quan trong nhat voi thuong mai dien tu: mot cau tra loi tron
 * tru nhung bia gia tien thi nguy hiem hon la khong tra loi.
 */
const scoreFaithfulness = (question, context, answer) =>
  judge(
    "Ban cham diem Faithfulness theo dinh nghia cua Ragas: tach cau tra loi thanh cac nhan dinh, dem ti le nhan dinh duoc NGU CANH chong lung. Moi con so ve gia, ton kho, ten gian hang deu phai co trong ngu canh moi tinh la duoc chong lung.",
    "NGU CANH:\n" + context + "\n\nCAU HOI: " + question + "\n\nCAU TRA LOI:\n" + answer
  );

/** Answer Relevance - cau tra loi co dung trong tam cau hoi khong. */
const scoreAnswerRelevance = (question, answer) =>
  judge(
    "Ban cham diem Answer Relevance theo dinh nghia cua Ragas: cau tra loi co truc tiep giai quyet cau hoi khong. Cau tra loi lan man, tra loi thua hoac ne tranh thi diem thap.",
    "CAU HOI: " + question + "\n\nCAU TRA LOI:\n" + answer
  );

/** Context Relevance - ngu canh lay ve co lien quan khong, hay toan nhieu. */
const scoreContextRelevance = (question, context) =>
  judge(
    "Ban cham diem Context Relevance theo dinh nghia cua Ragas: ti le phan ngu canh thuc su lien quan den cau hoi. Ngu canh chua nhieu san pham khong lien quan thi diem thap.",
    "CAU HOI: " + question + "\n\nNGU CANH:\n" + context
  );

/** Mot luot hoi tro ly tren mot cuoc chat tam, chi do do tre, khong cham diem. */
const timeAgentOnce = async (runAgent, userId, q) => {
  const chat = await prisma.aiChat.create({
    data: {
      user_id: userId,
      title: "rag-eval-latency",
      thread_key: "rag-eval-lat-" + Date.now() + "-" + Math.random().toString(16).slice(2),
    },
  });
  try {
    await prisma.aiMessage.create({ data: { ai_chat_id: chat.id, role: "user", content: q } });
    await pace();
    const started = Date.now();
    let firstTokenAt = null;
    await runAgent(prisma, chat.id, {
      onToken: () => {
        if (firstTokenAt === null) firstTokenAt = Date.now();
      },
    });
    return { ttft: firstTokenAt ? firstTokenAt - started : null, totalMs: Date.now() - started };
  } finally {
    await prisma.aiMessage.deleteMany({ where: { ai_chat_id: chat.id } });
    await prisma.aiChat.delete({ where: { id: chat.id } });
  }
};

const evaluateTriad = async () => {
  if (!hasGeminiApiKey()) {
    return { skipped: true, reason: "Thieu GEMINI_API_KEY" };
  }

  // Cham diem ton mot luot goi model cho moi chi so, nen chi lay mau chu khong
  // chay het 30 cau. Mau duoc rai deu qua cac nhom cau hoi.
  const perType = {};
  for (const q of dataset.questions) {
    perType[q.loai] = perType[q.loai] || [];
    perType[q.loai].push(q);
  }
  const sample = [];
  const perTypeCount = QUICK ? 1 : 2;
  for (const list of Object.values(perType)) {
    sample.push(...list.slice(0, perTypeCount));
  }

  const { runAgent } = await import("../ai/agent.js");
  const user = await prisma.user.findFirst({ select: { id: true } });
  const rows = [];

  // Do tre do tren CA 30 cau (nghiem thu T7: TTFT trung vi tren tap 30 cau),
  // khong chi tren mau cham diem: mau 8 cau qua nho, mot lan Gemini cham la
  // trung vi nhay qua mot.
  const latency = [];
  for (const item of QUICK ? sample : dataset.questions) {
    // Mot cau loi (vd. Gemini 429) khong duoc lam mat ca luot do.
    try {
      latency.push(await timeAgentOnce(runAgent, user.id, item.q));
      process.stdout.write("~");
    } catch {
      latency.push({ ttft: null, totalMs: null });
      process.stdout.write("x");
    }
  }
  process.stdout.write("\n");

  for (const item of sample) {
    const chat = await prisma.aiChat.create({
      data: {
        user_id: user.id,
        title: "rag-eval",
        thread_key: "rag-eval-" + Date.now() + "-" + Math.random().toString(16).slice(2),
      },
    });
    try {
      await prisma.aiMessage.create({
        data: { ai_chat_id: chat.id, role: "user", content: item.q },
      });

      await pace();
      const started = Date.now();
      let firstTokenAt = null;
      const result = await runAgent(prisma, chat.id, {
        onToken: () => {
          if (firstTokenAt === null) firstTokenAt = Date.now();
        },
      });
      const totalMs = Date.now() - started;

      // Cham diem tren dung ngu canh da dua vao model, gom ca khoi du lieu
      // san pham lan so lieu tra ve tu cong cu.
      const context = [
        result.meta?.contextText || '',
        ...(result.meta?.toolFacts || []),
      ].filter(Boolean).join('\n');

      // Cham tuan tu, khong song song: ba luot goi cung luc se pha vo bo
      // gian nhip va dinh gioi han 15 luot/phut.
      const faith = await scoreFaithfulness(item.q, context, result.text);
      const ansRel = await scoreAnswerRelevance(item.q, result.text);
      const ctxRel = await scoreContextRelevance(item.q, context);

      rows.push({
        q: item.q,
        loai: item.loai,
        faithfulness: faith?.score ?? null,
        answerRelevance: ansRel?.score ?? null,
        contextRelevance: ctxRel?.score ?? null,
        ttft: firstTokenAt ? firstTokenAt - started : null,
        totalMs,
        toolCalls: result.toolCalls.map((t) => t.name),
      });
      process.stdout.write(".");
    } finally {
      await prisma.aiMessage.deleteMany({ where: { ai_chat_id: chat.id } });
      await prisma.aiChat.delete({ where: { id: chat.id } });
    }
  }
  process.stdout.write("\n");

  const pick = (k) => rows.map((r) => r[k]).filter((v) => v != null);
  const median = (arr) => {
    const s = arr.filter((v) => v != null).sort((a, b) => a - b);
    return s.length ? Math.round(s[Math.floor(s.length / 2)]) : null;
  };
  return {
    skipped: false,
    sampleSize: rows.length,
    latencySize: latency.filter((r) => r.ttft != null).length,
    latencyTtftMedian: median(latency.map((r) => r.ttft)),
    latencyTotalMedian: median(latency.map((r) => r.totalMs)),
    faithfulness: round3(avg(pick("faithfulness"))),
    answerRelevance: round3(avg(pick("answerRelevance"))),
    contextRelevance: round3(avg(pick("contextRelevance"))),
    ttftMedian: Math.round(
      pick("ttft").sort((a, b) => a - b)[Math.floor(pick("ttft").length / 2)] || 0
    ),
    totalMedian: Math.round(
      pick("totalMs").sort((a, b) => a - b)[Math.floor(pick("totalMs").length / 2)] || 0
    ),
    rows,
  };
};

// ---------------------------------------------------------------------------
// Bao cao
// ---------------------------------------------------------------------------

const main = async () => {
  console.log("Do truy hoi tren " + dataset.questions.length + " cau hoi gan nhan...");
  const ret = await evaluateRetrieval();

  console.log("Cham RAG Triad theo phuong phap Ragas...");
  const triad = await evaluateTriad();

  const now = new Date().toISOString().slice(0, 16).replace("T", " ");
  const md = [
    "# Do luong he truy hoi tang cuong sinh",
    "",
    "> Sinh tu dong bang `npm run eval:rag`. Cap nhat: " + now + ".",
    "> Tap du lieu gan nhan: `eval/dataset.json` (" + dataset.questions.length + " cau hoi).",
    "",
    "## 1. Truy hoi",
    "",
    "| Chi so | Muc tieu de cuong | Do duoc |",
    "|---|---|---|",
    "| Recall@5 | > 75% | **" + ret.recallAt5 + "%** (" + ret.hits + "/" + ret.total + ") |",
    "| MRR | - | **" + ret.mrr + "** |",
    "",
    "### Theo nhom cau hoi",
    "",
    "| Nhom | Dung / Tong | Ti le |",
    "|---|---|---|",
    ...Object.entries(ret.byType).map(
      ([k, v]) => "| " + k + " | " + v.hit + "/" + v.total + " | " + pct(v.hit, v.total) + "% |"
    ),
    "",
    "### Chi tiet cau tra sai",
    "",
    ...(ret.rows.filter((r) => !r.hit).length === 0
      ? ["Khong co cau nao truot."]
      : [
          "| Cau hoi | Mong doi | Top 5 lay ve |",
          "|---|---|---|",
          ...ret.rows
            .filter((r) => !r.hit)
            .map(
              (r) =>
                "| " + r.q + " | " + r.expect.join(", ") + " | " + r.got.join(", ") + " |"
            ),
        ]),
    "",
    "## 2. RAG Triad (phuong phap Ragas)",
    "",
  ];

  if (triad.skipped) {
    md.push("Bo qua: " + triad.reason + ".", "");
  } else {
    md.push(
      "Cham bang LLM-as-judge tren mau " + triad.sampleSize + " cau, rai deu qua cac nhom.",
      "",
      "| Chi so | Y nghia | Diem |",
      "|---|---|---|",
      "| Faithfulness | Cau tra loi bam vao ngu canh, khong bia so lieu | **" + triad.faithfulness + "** |",
      "| Answer Relevance | Tra loi dung trong tam cau hoi | **" + triad.answerRelevance + "** |",
      "| Context Relevance | Ngu canh lay ve co lien quan | **" + triad.contextRelevance + "** |",
      "",
      "## 3. Do tre",
      "",
      "| Chi so | Muc tieu de cuong | Do duoc |",
      "|---|---|---|",
      "| Thoi gian toi ky tu dau tien (trung vi " + triad.latencySize + " cau) | < 1.5s | **" + fmtMs(triad.latencyTtftMedian) + "** |",
      "| Thoi gian hoan tat (trung vi " + triad.latencySize + " cau) | < 8s | **" + fmtMs(triad.latencyTotalMedian) + "** |",
      "| TTFT tren mau cham diem (" + triad.sampleSize + " cau) | - | " + triad.ttftMedian + "ms |",
      "",
      "Tach lam hai moc vi streaming chi cai thien moc thu nhat. Bao cao mot con",
      "so tong nhu truoc day che mat dung phan ma nguoi dung cam nhan duoc.",
      ""
    );
  }

  const out = path.join(__dirname, "..", "docs", "rag-evaluation.md");
  fs.writeFileSync(out, md.join("\n"));

  console.log("\n" + "-".repeat(58));
  console.log("Recall@5   : " + ret.recallAt5 + "% (" + ret.hits + "/" + ret.total + "), MRR " + ret.mrr);
  if (!triad.skipped) {
    console.log("RAG Triad  : F " + triad.faithfulness + " | AR " + triad.answerRelevance + " | CR " + triad.contextRelevance);
    console.log("Do tre     : TTFT " + fmtMs(triad.latencyTtftMedian) + ", tong " + fmtMs(triad.latencyTotalMedian) + " (trung vi " + triad.latencySize + " cau)");
  }
  console.log("-".repeat(58));
  console.log("Da ghi bao cao: " + path.relative(process.cwd(), out));

  await prisma.$disconnect();
};

main().catch(async (err) => {
  console.error("\nDo luong that bai:", err.message);
  await prisma.$disconnect();
  process.exit(1);
});
