// Ghi nhật ký thao tác.
//
// Trước đây hàm này nằm trong `controllers/audit.controller.js` và năm
// controller khác phải import ngược ra từ đó. Controller là bộ chuyển đổi HTTP:
// nhận req, trả res. Khi một controller phải import từ controller khác thì
// nghĩa là logic nghiệp vụ đang bị kẹt trong tầng HTTP, và cả tầng HTTP bị kéo
// theo vào mọi nơi cần dùng.
//
// Tầng service không biết gì về req/res. Nhờ vậy job chạy nền, script và bộ
// test đều gọi được mà không phải dựng một request giả.

import { prisma } from "../lib/db.js";

/**
 * Ghi một dòng nhật ký. Không bao giờ ném lỗi ra ngoài: nhật ký hỏng thì
 * nghiệp vụ chính vẫn phải chạy tiếp, chứ không kéo theo cả giao dịch.
 */
export const writeAuditLog = async ({
  userId,
  action,
  resource,
  resourceId,
  ip,
  userAgent,
  metadata,
}) => {
  try {
    await prisma.auditLog.create({
      data: {
        user_id: userId ? BigInt(userId) : null,
        action,
        resource: resource || null,
        resource_id: resourceId ? BigInt(resourceId) : null,
        ip: ip || null,
        user_agent: userAgent || null,
        metadata: metadata || {},
      },
    });
  } catch (err) {
    console.error("writeAuditLog error:", err);
  }
};

/**
 * Trích thông tin người gọi từ request, để controller không phải lặp lại
 * ba dòng giống nhau ở mỗi chỗ ghi log.
 */
export const auditContext = (req) => ({
  userId: req?.user?.id,
  ip: req?.ip,
  userAgent: req?.get?.("user-agent"),
});
