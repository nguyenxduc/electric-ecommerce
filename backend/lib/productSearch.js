// Tim kiem san pham o tang ha tang.
//
// Ba nhanh tim kiem va thuat toan hop nhat nam o day chu khong nam trong
// module AI, vi chung khong co gi rieng cua AI ca - day la kha nang tim kiem
// cua chinh catalog san pham.
//
// De trong ai/ thi o tim kiem cua nguoi dung, thu can chiu loi chinh ta nhat,
// lai khong voi toi duoc: no ket o `contains` trong khi chatbot da co day du
// full-text va trigram. Dat o lib/ thi ca hai cung dung mot kha nang.
//
//   ai/retrieval.js            -> them nhanh vector, phoi hop cho chatbot
//   controllers/product        -> full-text + trigram cho o tim kiem

import { tokenizeText } from "../lib/vietnamese.js";

/** Hằng số làm mượt của RRF. 60 là giá trị chuẩn trong bài báo gốc (Cormack 2009). */
export const RRF_K = 60;

/**
 * Hợp nhất nhiều bảng xếp hạng thành một, theo công thức
 *
 *     score(d) = Σ  weight_i / (k + rank_i(d))
 *
 * Hàm thuần, không chạm DB, để bộ test kiểm tra được quy tắc hợp nhất mà
 * không cần dựng cơ sở dữ liệu.
 *
 * @param {Array<{key:string, rows:Array<{id:any}>, weight?:number}>} rankings
 * @returns {Array<{id:string, score:number, sources:string[], ranks:object}>}
 */
export const fuseByRRF = (rankings, { k = RRF_K } = {}) => {
  const table = new Map();

  for (const ranking of rankings || []) {
    const weight = Number.isFinite(ranking?.weight) ? ranking.weight : 1;
    const rows = Array.isArray(ranking?.rows) ? ranking.rows : [];

    rows.forEach((row, index) => {
      const id = String(row?.id ?? "");
      if (!id) return;
      const rank = index + 1;
      const entry = table.get(id) || {
        id,
        score: 0,
        sources: [],
        ranks: {},
      };
      entry.score += weight / (k + rank);
      entry.sources.push(ranking.key);
      entry.ranks[ranking.key] = rank;
      table.set(id, entry);
    });
  }

  return Array.from(table.values()).sort((a, b) => {
    if (b.score !== a.score) return b.score - a.score;
    // Hoà điểm thì ưu tiên tài liệu được nhiều nhánh cùng tìm thấy.
    if (b.sources.length !== a.sources.length)
      return b.sources.length - a.sources.length;
    return String(a.id).localeCompare(String(b.id));
  });
};

/** Bỏ dấu, hạ chữ thường, tách token dùng chung cho nhánh full-text và trigram. */
/**
 * Tách token cho nhánh full-text và trigram.
 * Dùng chung bộ chuẩn hoá với phía Postgres, xem lib/vietnamese.js.
 */
export const tokenize = (text) => tokenizeText(text, 2);

const SELECT_COLUMNS = `p.id, p.name, p.price, p.discount, p.quantity, p.img,
    s.name AS shop_name, COALESCE(pe.content, '') AS content`;

/**
 * Nguoi mua chi thay hang cua gian hang dang hoat dong; quan tri vien thay het.
 * Cung quy tac voi buyerVisibilityWhere trong productQuery.js, chi khac o cho
 * day la SQL tho nen phai viet tay.
 */
const fromJoins = (activeShopsOnly) =>
  `FROM products p
  JOIN shops s ON s.id = p.shop_id AND s.deleted_at IS NULL${
    activeShopsOnly ? " AND s.status = 'active'" : ""
  }
  LEFT JOIN product_embeddings pe ON pe.product_id = p.id`;

/**
 * Nhánh 1 - full-text có xếp hạng.
 * Các token được nối bằng "or" nên câu hỏi dài vẫn khớp được một phần, thay vì
 * kiểu AND mặc định của websearch_to_tsquery làm câu dài không khớp gì cả.
 */
export const searchFullText = async (
  prisma,
  tokens,
  limit,
  { activeShopsOnly = true } = {}
) => {
  const query = tokens.join(" or ");
  if (!query) return [];
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS},
        ts_rank(p.search_vector, websearch_to_tsquery('simple', $1)) AS rank
     ${fromJoins(activeShopsOnly)}
     WHERE p.deleted_at IS NULL
       AND p.search_vector @@ websearch_to_tsquery('simple', $1)
     ORDER BY rank DESC
     LIMIT $2`,
    query,
    limit
  );
  return rows || [];
};

/**
 * Nhánh 2 - trigram chịu lỗi chính tả.
 * So từng token với tên sản phẩm bằng word_similarity chứ không dùng
 * similarity trên cả chuỗi: tên sản phẩm dài làm similarity tụt xuống dưới
 * ngưỡng, còn word_similarity chỉ so với đoạn khớp nhất bên trong tên.
 */
export const searchTrigram = async (
  prisma,
  tokens,
  limit,
  { activeShopsOnly = true } = {}
) => {
  const probes = tokens.filter((t) => t.length >= 4).slice(0, 6);
  if (probes.length === 0) return [];
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS},
        max(word_similarity(t.tok, immutable_unaccent(lower(p.name)))) AS sim
     ${fromJoins(activeShopsOnly)}
     CROSS JOIN unnest($1::text[]) AS t(tok)
     WHERE p.deleted_at IS NULL
       AND t.tok <% immutable_unaccent(lower(p.name))
     GROUP BY p.id, s.name, pe.content
     ORDER BY sim DESC
     LIMIT $2`,
    probes,
    limit
  );
  return rows || [];
};

/** Nhánh 3 - tương đồng vector trên pgvector. */
export const searchVector = async (
  prisma,
  queryVector,
  limit,
  { activeShopsOnly = true } = {}
) => {
  if (!Array.isArray(queryVector) || queryVector.length === 0) return [];
  const literal = `[${queryVector.join(",")}]`;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     ${fromJoins(activeShopsOnly)}
     WHERE p.deleted_at IS NULL AND pe.product_id IS NOT NULL
     ORDER BY pe.embedding <-> $1::vector
     LIMIT $2`,
    literal,
    limit
  );
  return rows || [];
};

/**
 * Tim id san pham khop voi mot cau tim kiem, chiu duoc loi go phim nhe.
 *
 * Dung cho o tim kiem cua nguoi dung. Khong co nhanh vector o day: o tim kiem
 * can tra ket qua tuc thi, ma nhung cau hoi lai phai goi dich vu ben ngoai,
 * doi them nua giay cho mot o tim kiem la khong dang.
 *
 * Tra ve mang id da xep hang. Rong nghia la khong nhanh nao tim thay gi, luc do
 * nguoi goi nen lui ve cach tim cu thay vi tra danh sach trong.
 */
export const findSearchCandidateIds = async (
  prisma,
  query,
  { limit = 200, activeShopsOnly = true } = {}
) => {
  const tokens = [...new Set(tokenize(query))].slice(0, 12);
  if (tokens.length === 0) return [];

  const [fts, trgm] = await Promise.all([
    searchFullText(prisma, tokens, limit, { activeShopsOnly }).catch((e) => {
      console.error("[productSearch:fulltext]", e?.message || e);
      return [];
    }),
    searchTrigram(prisma, tokens, limit, { activeShopsOnly }).catch((e) => {
      console.error("[productSearch:trigram]", e?.message || e);
      return [];
    }),
  ]);

  return fuseByRRF([
    { key: "fulltext", rows: fts, weight: 1 },
    { key: "trigram", rows: trgm, weight: 0.5 },
  ]).map((entry) => BigInt(entry.id));
};
