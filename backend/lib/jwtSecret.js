import "dotenv/config";

// Secret ký JWT. Trước đây mỗi file tự đọc env kèm một chuỗi mặc định
// hardcode, nên khi thiếu biến môi trường hệ thống vẫn chạy bằng secret mà
// bất kỳ ai đọc mã nguồn cũng biết. Tập trung về một chỗ và fail-fast thay vì
// im lặng chạy tiếp với secret công khai.
const WEAK_SECRETS = new Set([
  "your-access-token-secret-key-change-in-production",
  "change-me",
  "secret",
]);

const resolveSecret = () => {
  const secret = (
    process.env.ACCESS_TOKEN_SECRET ||
    process.env.JWT_SECRET ||
    ""
  ).trim();

  if (!secret) {
    throw new Error(
      "Thiếu ACCESS_TOKEN_SECRET (hoặc JWT_SECRET) trong biến môi trường. " +
        "Đặt một chuỗi ngẫu nhiên dài tối thiểu 32 ký tự trong backend/.env trước khi chạy server."
    );
  }

  if (WEAK_SECRETS.has(secret)) {
    throw new Error(
      "ACCESS_TOKEN_SECRET đang dùng giá trị mặc định trong tài liệu. " +
        "Sinh secret riêng bằng: node -e \"console.log(require('crypto').randomBytes(48).toString('hex'))\""
    );
  }

  if (secret.length < 32 && process.env.NODE_ENV === "production") {
    throw new Error(
      "ACCESS_TOKEN_SECRET quá ngắn cho môi trường production (cần tối thiểu 32 ký tự)."
    );
  }

  if (secret.length < 32) {
    console.warn(
      "[auth] Cảnh báo: ACCESS_TOKEN_SECRET ngắn hơn 32 ký tự, chỉ nên dùng khi chạy local."
    );
  }

  return secret;
};

export const ACCESS_TOKEN_SECRET = resolveSecret();

export const ACCESS_TOKEN_TTL = process.env.ACCESS_TOKEN_TTL || "7d";
