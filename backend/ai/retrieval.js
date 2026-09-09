// Truy hoi lai cho tro ly ao.
//
// Ba nhanh tim kiem va phep hop nhat RRF nam o lib/productSearch.js, dung
// chung voi o tim kiem san pham. File nay chi lo phan rieng cua chatbot:
// them nhanh vector va phoi hop ca ba nhanh.

import {
  fuseByRRF,
  searchFullText,
  searchTrigram,
  searchVector,
  tokenize,
} from "../lib/productSearch.js";

// Tai xuat de noi nao dang import tu day khong phai doi mot luot.
export {
  RRF_K,
  fuseByRRF,
  searchFullText,
  searchTrigram,
  searchVector,
  tokenize,
} from "../lib/productSearch.js";

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
