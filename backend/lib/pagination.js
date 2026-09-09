// Shared pagination helpers: page >= 1, limit clamped to [1, 100],
// total_pages = 0 for empty result sets.
export const parsePagination = (page, limit) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 20));
  return {
    currentPage,
    perPage,
    skip: (currentPage - 1) * perPage,
    // Ten dung trong Prisma. Xem ghi chu duoi day.
    take: perPage,
  };
};

// Vi sao them `take`:
//
// Helper nay da co san va da chan limit trong khoang [1, 100] tu dau. Nhung
// no chi tra `perPage`, nen moi controller van phai tu viet them mot dong
// `take: Number(limit)`. Vi van phai viet lai nen 12 trong 14 endpoint danh
// sach da bo qua luon helper, tu tinh skip va limit thang tu query string -
// tuc la khong qua buoc chan tren nao, `?limit=999999` keo duoc ca bang ve.
//
// Mot ham dung chung ma van phai viet them mot dong o moi cho goi thi som hay
// muon cung bi bo qua. Tra san `take` de khong con ly do gi phai tu viet nua.
export const buildPaginationMeta = (currentPage, perPage, total) => ({
  current_page: currentPage,
  per_page: perPage,
  total_count: total,
  total_pages: total === 0 ? 0 : Math.ceil(total / perPage),
});

/**
 * Chan tren cho cac endpoint tra danh sach nhung KHONG phan trang, vi du
 * "san pham tuong tu". Nhung cho nay khong co skip/page nen khong dung
 * parsePagination duoc, nhung van can chan `?limit=999999`.
 */
export const clampLimit = (limit, fallback = 20, max = 100) => {
  const n = Number.parseInt(limit, 10);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.min(n, max);
};
