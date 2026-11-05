// Truy hoi lai cho tro ly ao.
//
// Ba nhanh tim kiem va phep hop nhat RRF nam o lib/productSearch.js, dung
// chung voi o tim kiem san pham. File nay chi lo phan rieng cua chatbot:
// them nhanh vector va phoi hop ca ba nhanh.

import {
  fetchRowsByIds,
  fuseByRRF,
  searchFullText,
  searchTrigram,
  searchVector,
  tokenize,
} from "../lib/productSearch.js";
import { normalizeText } from "../lib/vietnamese.js";

// Cache TTL cho hang xep hang (id + diem RRF), KHONG cache gia/ton kho/mo ta:
// nhung truong do luon duoc doc lai tu DB o fetchRowsByIds moi lan dung, kieu
// cau hoi lap lai moi thay doi la thu tu san pham chu khong phai so lieu gia.
const RANK_CACHE_TTL_MS = Number(
  process.env.AI_RETRIEVAL_CACHE_TTL_MS || 120000
);
const rankCache = new Map();
const rankCacheGet = (key) => {
  const hit = rankCache.get(key);
  if (!hit) return null;
  if (Date.now() > hit.expires) {
    rankCache.delete(key);
    return null;
  }
  return hit.fused;
};
// Chan tren so khoa: khoa la cau hoi nguoi dung go, moi cau moi la mot khoa,
// khong chan thi Map lon vo han. Map giu thu tu chen nen xoa khoa dau = cu nhat.
const RANK_CACHE_MAX = 1000;
const rankCacheSet = (key, fused) => {
  if (RANK_CACHE_TTL_MS <= 0) return; // TTL <= 0: tat cache (script do dung de so khong bi cache do)
  rankCache.delete(key);
  if (rankCache.size >= RANK_CACHE_MAX) rankCache.delete(rankCache.keys().next().value);
  rankCache.set(key, { fused, expires: Date.now() + RANK_CACHE_TTL_MS });
};

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
  let branchFailed = false;
  const report = (branch, err) => {
    branchFailed = true;
    if (onError) onError(branch, err);
    else console.error(`[retrieval:${branch}]`, err?.message || err);
  };

  // Cache tra ve THU TU san pham (id + diem), khong phai gia/ton kho - nen
  // cache hit van bo qua duoc ca ba nhanh tim kiem (ke ca lan goi API nhung)
  // ma khong lam cu di so lieu tien, vi byId luon duoc doc lai ben duoi.
  // Co/khong nhanh vector cho ra thu hang khac nhau, nen phai nam trong khoa.
  const cacheKey = `${normalizeText(question).slice(0, 500)}|${candidateLimit}|${embedQuery ? "v" : "nv"}`;
  let fused = rankCacheGet(cacheKey);
  let byId = null;

  if (!fused) {
    const tokens = [...new Set(tokenize(question))].slice(0, 12);
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

    fused = fuseByRRF([
      { key: "fulltext", rows: ftsRows, weight: 1 },
      { key: "vector", rows: vecRows, weight: 1 },
      // Trigram chỉ là lưới an toàn cho lỗi gõ phím, nhiễu hơn hai nhánh kia nên
      // đóng góp ít hơn vào điểm hợp nhất.
      { key: "trigram", rows: trgmRows, weight: 0.5 },
    ]);
    // Mot nhanh loi thi thu hang bi thieu: khong cache de lan sau duoc thu lai.
    if (!branchFailed) rankCacheSet(cacheKey, fused);

    byId = new Map();
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
  }

  const topEntries = fused.slice(0, topK);

  if (!byId) {
    // Cache hit: thu hang da co san nhung gia/ton kho/mo ta phai doc lai tuoi.
    const freshRows = await fetchRowsByIds(
      prisma,
      topEntries.map((e) => e.id)
    );
    byId = new Map(freshRows.map((row) => [String(row.id), row]));
  }

  // San pham bi xoa/shop bi dinh chi sau khi cache: bo qua, khong tra muc rong.
  return topEntries.filter((entry) => byId.has(entry.id)).map((entry) => ({
    ...byId.get(entry.id),
    _rrfScore: entry.score,
    _sources: entry.sources,
    _ranks: entry.ranks,
  }));
};

/**
 * Giam so ung vien DUA VAO NGU CANH LLM khi ca ba nhanh tim kiem (full-text,
 * vector, trigram) cung dong y tren ung vien dau tien trong khi ung vien thu
 * hai yeu dong thuan hon han - dau hieu cau hoi neu dich danh mot san pham
 * cu the, chi can 1-2 ung vien thay vi ca 5.
 *
 * Dung diem RRF (weight/(k+rank), k=60) lam ty le so sanh KHONG dung: cong
 * thuc nen diem giua cac hang rat gan nhau (vd. hang 1 va hang 2 cung mot
 * nhanh chi lech ~2%), nen moi nguong ty le hop ly gan nhu khong bao gio dat.
 * So nhanh dong y la tin hieu ro rang va de giai thich hon.
 *
 * KHONG duoc dung lai cho do Recall@5: chi so do dung dinh nghia "trong topK
 * tra ve" nen can retrieveHybrid tra du so luong duoc yeu cau.
 */
export const pickConfidentSubset = (retrieved, { maxWhenConfident = 2 } = {}) => {
  if (!retrieved || retrieved.length < 2) return retrieved;
  const topSources = retrieved[0]._sources?.length ?? 0;
  const secondSources = retrieved[1]._sources?.length ?? 0;
  if (topSources >= 3 && secondSources < topSources) {
    return retrieved.slice(0, maxWhenConfident);
  }
  return retrieved;
};
