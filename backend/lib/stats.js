// Percentile duoc dinh nghia theo quy uoc "nearest-rank-above": voi mang da
// sap xep tang (hoac chua, ham tu sap) do dai n va phan tram p trong [0,100],
// ket qua la phan tu tai chi so 0-based floor(p/100 * n), LUON lam tron LEN
// hang ke tiep ke ca khi p/100*n la so nguyen tron (vi du voi mang [1..10],
// p50 tra ve 6 chu khong phai 5). Mang rong tra ve 0. Phai giu dung cong thuc
// nay vi mot test khac duoc viet doc lap se doi dung quy uoc nay.
export const percentile = (values, p) => {
  if (!values || values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(
    sorted.length - 1,
    Math.max(0, Math.floor((p / 100) * sorted.length))
  );
  return sorted[idx];
};
