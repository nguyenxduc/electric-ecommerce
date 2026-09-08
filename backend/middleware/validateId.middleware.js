// Chan ID sai dinh dang ngay o tang route.
//
// Controller doi ID la so va goi thang BigInt(id). Neu client gui
// /api/products/abc thi BigInt() nem loi, roi khoi try/catch cua controller
// bat lai va tra 500 - trong khi day la loi dau vao cua client, dung ra phai
// la 400, va thong bao loi noi bo ("Cannot convert abc to a BigInt") cung
// khong nen lo ra ngoai.
//
// Dat guard o day thi 59 route param dang so duoc bao ve mot luot, khong phai
// sua rai rac trong tung controller.

// Ten cac route param mang gia tri so. `slug` va `key` la chuoi nen khong nam
// trong danh sach - dung them vao.
const NUMERIC_ID_PARAMS = [
  "id",
  "chatId",
  "productId",
  "product_id",
  "categoryId",
  "imageId",
];

// ID trong he thong la BigInt tu autoincrement: chi nhan chuoi toan chu so,
// khong dau, khong so 0 dung dau (tru chinh so 0), do dai co han de tranh
// chuoi cuc dai.
const isValidId = (value) =>
  typeof value === "string" && /^[1-9][0-9]{0,18}$/.test(value);

const makeGuard = (paramName) => (req, res, next, value) => {
  if (!isValidId(value)) {
    return res.status(400).json({
      success: false,
      error: `Tham so "${paramName}" phai la mot ID dang so hop le`,
    });
  }
  next();
};

// Goi mot lan cho moi router co route param dang so:
//   registerIdParams(router)
// Dang ky ten khong xuat hien trong router do la vo hai.
export const registerIdParams = (router, names = NUMERIC_ID_PARAMS) => {
  for (const name of names) {
    router.param(name, makeGuard(name));
  }
  return router;
};

export { isValidId, NUMERIC_ID_PARAMS };
