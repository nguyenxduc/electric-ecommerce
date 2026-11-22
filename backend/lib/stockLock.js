// Thu tu khoa dong kho dung chung cho tru kho (checkout) va hoan kho (huy,
// tra hang, xoa don).
//
// Moi UPDATE tren products / product_variants / product_colors khoa dong toi
// cuoi giao dich. Hai giao dich khoa cung cac dong nhung theo thu tu khac nhau
// se cho vong tron -> Postgres bao deadlock (40P01) va huy mot ben. Vi vay MOI
// noi cham vao kho phai:
//   1. duyet cac mon theo `compareStockLockKey(stockLockKey(...))`, va
//   2. trong moi mon, khoa theo thu tu: bien the -> mau -> san pham.

/** Khoa sap xep: (product_id, variant_id, mau). */
export const stockLockKey = ({ productId, variantId, color }) => [
  BigInt(productId),
  variantId == null ? -1n : BigInt(variantId),
  `${color?.code ?? ""}|${color?.name ?? ""}`,
];

export const compareStockLockKey = (a, b) => {
  for (let i = 0; i < a.length; i++) {
    if (a[i] < b[i]) return -1;
    if (a[i] > b[i]) return 1;
  }
  return 0;
};
