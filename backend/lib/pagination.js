// Shared pagination helpers: page >= 1, limit clamped to [1, 100],
// total_pages = 0 for empty result sets.
export const parsePagination = (page, limit) => {
  const currentPage = Math.max(1, Number(page) || 1);
  const perPage = Math.min(100, Math.max(1, Number(limit) || 20));
  return {
    currentPage,
    perPage,
    skip: (currentPage - 1) * perPage,
  };
};

export const buildPaginationMeta = (currentPage, perPage, total) => ({
  current_page: currentPage,
  per_page: perPage,
  total_count: total,
  total_pages: total === 0 ? 0 : Math.ceil(total / perPage),
});
