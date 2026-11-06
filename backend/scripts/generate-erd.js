/**
 * Sinh so do ERD tu chinh schema.prisma.
 *
 *   npm run docs:erd
 *
 * Doc truc tiep file schema nen so do khong bao gio lech voi database that —
 * ve tay mot lan roi sua schema la so do thanh sai ngay.
 *
 * 34 bang trong mot so do thi khong ai doc noi, nen chia theo mien nghiep vu.
 * Bang nao khong duoc gan mien se hien o muc "chua phan nhom" de nguoi doc
 * biet ma bo sung — khong am tham bo sot.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const SCHEMA = path.join(__dirname, "..", "prisma", "schema.prisma");
const OUT = path.join(__dirname, "..", "docs", "erd.md");

// Bang ha tang cua cong cu migration, khong thuoc nghiep vu.
const IGNORED = new Set(["ArInternalMetadata", "SchemaMigration"]);

const DOMAINS = [
  {
    title: "1. Gian hang va danh muc san pham",
    note: "Xuong song cua mo hinh da gian hang: mot nguoi dung so huu toi da mot Shop, moi Product thuoc dung mot Shop.",
    models: [
      "Shop", "Product", "Category", "SubCategory",
      "ProductColor", "ProductSpec", "ProductFilterValue",
      "FilterKey", "FilterOption",
    ],
  },
  {
    title: "2. Nguoi dung, gio hang va uu dai",
    note: "User la trung tam: vua la nguoi mua, vua co the la chu shop (quan he ShopOwner).",
    models: ["User", "Cart", "CartItem", "Wishlist", "Coupon", "LoyaltyPointTransaction"],
  },
  {
    title: "3. Don hang, thanh toan va doi tra",
    note: "Diem then chot cua sang da gian hang: mot lan thanh toan tao ra mot OrderGroup, roi tach thanh N Order — moi shop mot don, tu quan trang thai rieng.",
    models: ["OrderGroup", "Order", "OrderItem", "Payment", "ReturnRequest", "Review"],
  },
  {
    title: "4. Tri tue nhan tao",
    note: "ProductEmbedding luu vector pgvector phuc vu truy hoi RAG; UserBehavior va ProductSimilarity phuc vu loc cong tac.",
    models: [
      "ProductEmbedding", "AiChat", "AiMessage", "AiFeedback",
      "UserBehavior", "UserBehaviorDaily", "ProductSimilarity", "RecommendationLog",
    ],
  },
  {
    title: "5. Ho tro va van hanh",
    note: "Chat hai kenh (buyer-san va buyer-shop), thong bao, nhat ky thao tac va tham so van hanh.",
    models: ["Chat", "Message", "Notification", "AuditLog", "Setting"],
  },
];

// ---------------------------------------------------------------------------

// Kieu vo huong Prisma ho tro. Moi kieu KHONG nam trong day va viet hoa deu
// duoc coi la tro toi mot model khac (quan he).
const SCALAR_TYPES = new Set([
  "String", "Boolean", "Int", "BigInt", "Float",
  "Decimal", "DateTime", "Json", "Bytes",
]);

const parseSchema = (text) => {
  const models = new Map();
  const re = /^model\s+(\w+)\s*\{([\s\S]*?)^\}/gm;
  let m;
  while ((m = re.exec(text))) {
    const [, name, body] = m;
    const fields = [];
    const relations = [];

    for (const raw of body.split(/\r?\n/)) {
      const line = raw.trim();
      if (!line || line.startsWith("//") || line.startsWith("@@")) continue;

      const parts = line.split(/\s+/);
      const fieldName = parts[0];
      let type = parts[1];
      if (!fieldName || !type) continue;

      const optional = type.endsWith("?");
      const list = type.endsWith("[]");
      type = type.replace(/[?[\]]/g, "");

      // Kieu vo huong cua Prisma cung viet hoa (BigInt, String, DateTime...),
      // nen khong the dua vao chu hoa de doan quan he — phai loai tru tuong minh.
      const isRelation = !SCALAR_TYPES.has(type) && /^[A-Z]/.test(type);
      if (isRelation) {
        const fk = line.match(/fields:\s*\[(\w+)\]/);
        relations.push({ target: type, list, optional, viaField: fk?.[1] ?? null });
        continue;
      }

      const isId = line.includes("@id");
      const isUnique = line.includes("@unique");
      fields.push({ name: fieldName, type, optional, isId, isUnique });
    }
    models.set(name, { name, fields, relations });
  }
  return models;
};

const mermaidType = (t) =>
  ({ BigInt: "bigint", String: "string", Int: "int", Float: "float",
     Boolean: "bool", DateTime: "datetime", Decimal: "decimal", Json: "json" }[t] || t.toLowerCase());

const renderDomain = (domain, models) => {
  const present = domain.models.filter((n) => models.has(n));
  const inSet = new Set(present);
  const lines = ["```mermaid", "erDiagram"];

  for (const name of present) {
    const model = models.get(name);
    lines.push(`  ${name} {`);
    for (const f of model.fields) {
      const marks = [f.isId ? "PK" : "", f.isUnique && !f.isId ? "UK" : ""]
        .filter(Boolean)
        .join(",");
      lines.push(`    ${mermaidType(f.type)} ${f.name}${marks ? ` "${marks}"` : ""}`);
    }
    lines.push("  }");
  }

  // Chi ve quan he ma CA HAI dau deu nam trong mien nay
  const drawn = new Set();
  for (const name of present) {
    for (const rel of models.get(name).relations) {
      if (!inSet.has(rel.target)) continue;
      const key = [name, rel.target].sort().join("~");
      if (drawn.has(key)) continue;
      drawn.add(key);
      // rel.list = phia ben kia la nhieu
      const card = rel.list ? "||--o{" : rel.optional ? "}o--||" : "}|--||";
      lines.push(`  ${name} ${card} ${rel.target} : ""`);
    }
  }

  lines.push("```");
  return lines.join("\n");
};

const main = () => {
  const text = fs.readFileSync(SCHEMA, "utf8");
  const models = parseSchema(text);

  const grouped = new Set(DOMAINS.flatMap((d) => d.models));
  const ungrouped = [...models.keys()].filter(
    (n) => !grouped.has(n) && !IGNORED.has(n)
  );

  const businessCount = [...models.keys()].filter((n) => !IGNORED.has(n)).length;

  const out = [
    "# So do quan he thuc the (ERD)",
    "",
    `> Sinh tu \`prisma/schema.prisma\` bang \`npm run docs:erd\`.`,
    "> **Khong sua tay file nay** — sua schema roi chay lai lenh tren.",
    "",
    `Tong cong ${businessCount} bang nghiep vu (chua tinh 2 bang ha tang cua`,
    "cong cu migration). Chia theo mien de doc duoc; quan he bac cau giua cac",
    "mien duoc noi trong phan mo ta cua tung muc.",
    "",
    ...DOMAINS.flatMap((d) => {
      const present = d.models.filter((n) => models.has(n));
      const missing = d.models.filter((n) => !models.has(n));
      return [
        `## ${d.title}`,
        "",
        d.note,
        "",
        renderDomain(d, models),
        "",
        ...(missing.length
          ? [`> Luu y: khong tim thay trong schema: ${missing.join(", ")}`, ""]
          : []),
      ];
    }),
    ...(ungrouped.length
      ? [
          "## Chua phan nhom",
          "",
          "Cac bang sau co trong schema nhung chua duoc gan mien nao trong",
          "`scripts/generate-erd.js` — bo sung vao `DOMAINS` de chung xuat hien:",
          "",
          ...ungrouped.map((n) => `- \`${n}\``),
          "",
        ]
      : []),
  ].join("\n");

  fs.writeFileSync(OUT, out);
  console.log(`Da sinh ERD cho ${businessCount} bang -> ${path.relative(process.cwd(), OUT)}`);
  if (ungrouped.length) {
    console.log(`Canh bao: ${ungrouped.length} bang chua phan nhom: ${ungrouped.join(", ")}`);
  }
};

main();
