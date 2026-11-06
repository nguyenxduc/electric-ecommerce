// Chuẩn hoá tiếng Việt dùng chung cho mọi tầng tìm kiếm.
//
// Vì sao phải gom về một chỗ: phía Postgres, chỉ mục full-text và trigram được
// dựng trên immutable_unaccent(), hàm này ánh xạ "Đ" thành "D". Phía JavaScript
// trước đây chỉ dùng normalize("NFD") rồi bỏ dấu tổ hợp. Nhưng "đ" và "Đ" là
// ký tự có gạch ngang chứ không phải nguyên âm mang dấu, nên NFD không tách ra
// được và bước lọc [^a-z0-9] xoá luôn cả chữ:
//
//     "điện thoại"  ->  "ien thoai"     (sai, mất chữ đầu)
//     immutable_unaccent  ->  "dien thoai"
//
// Hai bên lệch nhau nghĩa là token gửi xuống truy vấn không khớp được với thứ
// đã lập chỉ mục. Mọi câu hỏi tiếng Việt có chữ "đ" đều bị ảnh hưởng.

/** Bỏ dấu tiếng Việt, ánh xạ đ/Đ giống hệt unaccent của Postgres. */
export const deaccent = (value) =>
  String(value ?? "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "");

/** Dạng chuẩn để so khớp: bỏ dấu, chữ thường, gom khoảng trắng. */
export const normalizeText = (value) =>
  deaccent(value)
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

/** Tách token, bỏ các token ngắn hơn minLength. */
export const tokenizeText = (value, minLength = 2) =>
  normalizeText(value)
    .split(/\s+/)
    .filter((t) => t.length >= minLength);

/** Slug dùng cho URL sản phẩm. */
export const slugifyText = (value) =>
  deaccent(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
