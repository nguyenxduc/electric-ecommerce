// Prisma hieu object trong `where` la bo loc: `{ email: { contains: "x" } }`
// khop nguoi dung bat ky. Cac truong duoi day controller dua thang vao `where`
// nen bat buoc la chuoi; object/mang bi chan truoc khi toi controller.
// (Lo hong da tai hien: dang nhap bang email {contains} + mat khau doan,
// dung coupon bang code {not: ""} - xem tests/29-scalar-inputs.)
const SCALAR_KEYS = ["email", "password", "new_password", "code", "coupon_code"];

export const requireScalarBody = (req, res, next) => {
  const body = req.body;
  if (body && typeof body === "object") {
    for (const key of SCALAR_KEYS) {
      const v = body[key];
      if (v !== undefined && v !== null && typeof v !== "string") {
        return res.status(400).json({ success: false, message: `${key} must be a string`, error: `${key} must be a string` });
      }
    }
  }
  next();
};
