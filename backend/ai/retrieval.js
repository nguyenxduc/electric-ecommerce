// Truy hồi lai (hybrid retrieval) cho trợ lý ảo.
//
// Ba nhánh tìm kiếm chạy song song, mỗi nhánh giỏi một kiểu câu hỏi:
//
//   1. Full-text (tsvector + ts_rank)  - bắt đúng mã máy và số hiệu dòng sản
//      phẩm: "RTX 4060", "XPS 15", "WH-1000XM5". Đây là chỗ tìm kiếm ngữ nghĩa
//      yếu nhất vì các chuỗi này gần như không mang ngữ nghĩa.
//   2. Trigram (word_similarity)       - lớp cứu khi người dùng gõ sai chính tả
//      nhẹ: "iphon", "macbok", "samsng galaxy".
//   3. Vector (pgvector)               - bắt câu hỏi mô tả nhu cầu: "tai nghe
//      chống ồn đi máy bay", nơi không có từ khoá nào trùng tên sản phẩm.
//
// Kết quả ba nhánh được hợp nhất bằng Reciprocal Rank Fusion thay vì cộng
// điểm thủ công. Lý do: điểm của ts_rank, word_similarity và khoảng cách
// vector nằm trên ba thang đo khác nhau, cộng thẳng là so sánh khập khiễng.
// RRF chỉ dùng *thứ hạng* nên không cần chuẩn hoá thang đo.

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

const FROM_JOINS = `FROM products p
  JOIN shops s ON s.id = p.shop_id AND s.status = 'active' AND s.deleted_at IS NULL
  LEFT JOIN product_embeddings pe ON pe.product_id = p.id`;

/**
 * Nhánh 1 - full-text có xếp hạng.
 * Các token được nối bằng "or" nên câu hỏi dài vẫn khớp được một phần, thay vì
 * kiểu AND mặc định của websearch_to_tsquery làm câu dài không khớp gì cả.
 */
export const searchFullText = async (prisma, tokens, limit) => {
  const query = tokens.join(" or ");
  if (!query) return [];
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS},
        ts_rank(p.search_vector, websearch_to_tsquery('simple', $1)) AS rank
     ${FROM_JOINS}
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
export const searchTrigram = async (prisma, tokens, limit) => {
  const probes = tokens.filter((t) => t.length >= 4).slice(0, 6);
  if (probes.length === 0) return [];
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS},
        max(word_similarity(t.tok, immutable_unaccent(lower(p.name)))) AS sim
     ${FROM_JOINS}
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
export const searchVector = async (prisma, queryVector, limit) => {
  if (!Array.isArray(queryVector) || queryVector.length === 0) return [];
  const literal = `[${queryVector.join(",")}]`;
  const rows = await prisma.$queryRawUnsafe(
    `SELECT ${SELECT_COLUMNS}
     ${FROM_JOINS}
     WHERE p.deleted_at IS NULL AND pe.product_id IS NOT NULL
     ORDER BY pe.embedding <-> $1::vector
     LIMIT $2`,
    literal,
    limit
  );
  return rows || [];
};

/**
 * Chạy cả ba nhánh rồi hợp nhất.
 *
 * Dùng allSettled chứ không dùng all: nhánh vector phụ thuộc dịch vụ nhúng bên
 * ngoài, khi hết hạn mức hoặc mất mạng thì hai nhánh còn lại vẫn phải trả được
 * kết quả. Trước đây lỗi ở nhánh vector làm rỗng toàn bộ ngữ cảnh.
 *
 * @param {object} opts.embedQuery hàm async (text) => number[]; bỏ trống thì
 *   chỉ chạy hai nhánh trên cơ sở dữ liệu.
 */
export const retrieveHybrid = async (
  prisma,
  question,
  { topK = 5, embedQuery = null, candidateLimit = 30, onError = null } = {}
) => {
  const tokens = [...new Set(tokenize(question))].slice(0, 12);
  const report = (branch, err) => {
    if (onError) onError(branch, err);
    else console.error(`[retrieval:${branch}]`, err?.message || err);
  };

  const tasks = [
    searchFullText(prisma, tokens, candidateLimit).catch((e) => {
      report("fulltext", e);
      return [];
    }),
    searchTrigram(prisma, tokens, candidateLimit).catch((e) => {
      report("trigram", e);
      return [];
    }),
    embedQuery
      ? Promise.resolve()
          .then(() => embedQuery(question))
          .then((v) => searchVector(prisma, v, candidateLimit))
          .catch((e) => {
            report("vector", e);
            return [];
          })
      : Promise.resolve([]),
  ];

  const [ftsRows, trgmRows, vecRows] = await Promise.all(tasks);

  const fused = fuseByRRF([
    { key: "fulltext", rows: ftsRows, weight: 1 },
    { key: "vector", rows: vecRows, weight: 1 },
    // Trigram chỉ là lưới an toàn cho lỗi gõ phím, nhiễu hơn hai nhánh kia nên
    // đóng góp ít hơn vào điểm hợp nhất.
    { key: "trigram", rows: trgmRows, weight: 0.5 },
  ]);

  const byId = new Map();
  for (const row of [...ftsRows, ...vecRows, ...trgmRows]) {
    const id = String(row?.id ?? "");
    if (!id) continue;
    const prev = byId.get(id);
    if (!prev) {
      byId.set(id, row);
      continue;
    }
    // Giữ bản ghi giàu thông tin nhất giữa các nhánh.
    if (!prev.content && row.content) prev.content = row.content;
    if ((!prev.img || prev.img.length === 0) && row.img) prev.img = row.img;
  }

  return fused.slice(0, topK).map((entry) => ({
    ...byId.get(entry.id),
    _rrfScore: entry.score,
    _sources: entry.sources,
    _ranks: entry.ranks,
  }));
};
