import rateLimit from "express-rate-limit";

// Giới hạn tần suất request theo IP. Ba mức khác nhau vì ba loại endpoint có
// rủi ro khác nhau: đăng nhập bị dò mật khẩu, endpoint AI tốn tiền gọi Gemini,
// còn phần còn lại chỉ cần chặn vòng lặp gọi API bất thường.
const enabled = String(process.env.RATE_LIMIT_ENABLED ?? "true").toLowerCase();
const RATE_LIMIT_ENABLED = !["0", "false", "off", "no"].includes(enabled);

const num = (key, fallback) => {
  const value = Number(process.env[key]);
  return Number.isFinite(value) && value > 0 ? value : fallback;
};

const WINDOW_MS = num("RATE_LIMIT_WINDOW_MS", 15 * 60 * 1000);

const build = ({ max, message }) =>
  rateLimit({
    windowMs: WINDOW_MS,
    max,
    standardHeaders: true,
    legacyHeaders: false,
    skip: () => !RATE_LIMIT_ENABLED,
    handler: (req, res) =>
      res.status(429).json({ success: false, error: message }),
  });

// Toàn bộ /api — chỉ để chặn vòng lặp gọi API chạy loạn, không cản người dùng thật.
//
// Ngưỡng đặt rộng tay vì đây KHÔNG phải biện pháp bảo mật (việc đó là của
// authLimiter và aiLimiter). Mức 1000 ban đầu quá chặt: một lần `npm test` tốn
// khoảng 300-400 request nên chạy lại vài lần trong 15 phút là dính 429 hàng
// loạt, rất dễ bị hiểu nhầm thành lỗi nghiệp vụ. 5000/15 phút (~5.5 req/giây)
// vẫn chặn được script quét hàng loạt mà không cản đường kiểm thử và demo.
export const apiLimiter = build({
  max: num("RATE_LIMIT_API_MAX", 5000),
  message:
    "Bạn gửi quá nhiều yêu cầu trong thời gian ngắn. Vui lòng thử lại sau ít phút.",
});

// Đăng nhập / đăng ký / quên mật khẩu — chống dò mật khẩu tự động.
export const authLimiter = build({
  max: num("RATE_LIMIT_AUTH_MAX", 300),
  message:
    "Quá nhiều lần thử xác thực từ địa chỉ này. Vui lòng thử lại sau 15 phút.",
});

// Endpoint gọi Gemini — mỗi request tốn quota thật, cần siết chặt nhất.
export const aiLimiter = build({
  max: num("RATE_LIMIT_AI_MAX", 60),
  message:
    "Bạn đã dùng hết lượt gọi trợ lý AI cho phép. Vui lòng thử lại sau ít phút.",
});

export const rateLimitStatus = () =>
  RATE_LIMIT_ENABLED
    ? `bật (cửa sổ ${Math.round(WINDOW_MS / 60000)} phút)`
    : "tắt qua RATE_LIMIT_ENABLED";
