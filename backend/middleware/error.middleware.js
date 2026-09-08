// Luoi an toan o tang ung dung.
//
// Express 4 KHONG tu bat promise bi reject: neu mot handler async nem loi ma
// khong co try/catch bao quanh thi request treo cho den khi client timeout,
// khong co log, khong co response. Ca backend co 170 khoi try/catch nen phan
// lon duong di da an toan, nhung chi can mot cho quen la treo - va cang them
// route moi thi rui ro cang tang.
//
// Ba manh o day:
//   asyncHandler - boc handler async, day loi sang next() thay vi de treo
//   notFoundHandler - tra JSON 404 dung dinh dang thay vi trang HTML cua Express
//   errorHandler - mot cho duy nhat log va tra loi khi co su co

export class AppError extends Error {
  constructor(message, statusCode = 400, details) {
    super(message);
    this.name = "AppError";
    this.statusCode = statusCode;
    if (details !== undefined) this.details = details;
  }
}

// Dung cho route moi: `router.get("/x", asyncHandler(handler))`.
// Handler khong con can try/catch chi de tra 500.
export const asyncHandler = (handler) => (req, res, next) =>
  Promise.resolve(handler(req, res, next)).catch(next);

export const notFoundHandler = (req, res) => {
  res.status(404).json({
    success: false,
    error: `Khong tim thay endpoint: ${req.method} ${req.originalUrl}`,
  });
};

// Anh xa ma loi cua Prisma sang HTTP status co nghia, thay vi tra 500 cho moi thu.
const prismaStatus = (code) => {
  switch (code) {
    case "P2002": // trung rang buoc unique
      return { status: 409, message: "Du lieu da ton tai" };
    case "P2025": // khong tim thay ban ghi
      return { status: 404, message: "Khong tim thay du lieu" };
    case "P2003": // sai khoa ngoai
      return { status: 400, message: "Du lieu tham chieu khong hop le" };
    case "P1001": // khong ket noi duoc database
      return { status: 503, message: "Khong ket noi duoc co so du lieu" };
    default:
      return null;
  }
};

// Phai co du 4 tham so thi Express moi nhan ra day la error handler.
// eslint-disable-next-line no-unused-vars
export const errorHandler = (err, req, res, next) => {
  // Neu response da bat dau gui thi giao lai cho Express dong ket noi.
  if (res.headersSent) return next(err);

  const mapped = err?.code ? prismaStatus(err.code) : null;
  const statusCode = err?.statusCode ?? mapped?.status ?? 500;
  const isServerFault = statusCode >= 500;

  // Loi 5xx la bug cua minh - log day du. Loi 4xx la dau vao sai cua client,
  // log ngan gon de khong lam nhieu log that.
  if (isServerFault) {
    console.error(`[error] ${req.method} ${req.originalUrl}`, err);
  } else {
    console.warn(
      `[warn] ${req.method} ${req.originalUrl} -> ${statusCode}: ${err?.message}`
    );
  }

  // Khong ro ri chi tiet loi noi bo ra ngoai o moi truong production.
  const exposeDetail = !isServerFault || process.env.NODE_ENV !== "production";

  res.status(statusCode).json({
    success: false,
    error:
      mapped?.message ??
      (exposeDetail ? err?.message : null) ??
      "Loi may chu noi bo",
    ...(err?.details ? { details: err.details } : {}),
  });
};
