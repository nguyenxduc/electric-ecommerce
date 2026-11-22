import { prisma } from "../lib/db.js";
import { writeAuditLog } from "./audit.service.js";
import { notifyUser } from "../lib/notify.js";

// Go san pham vi pham + bao seller. Dung chung cho PATCH /products/:id/takedown
// va xu ly tinh nang bao cao san pham. Tra null neu san pham khong ton tai.
// ctx = { userId, ip, userAgent } de ghi audit (xem auditContext).
export const takedownProductById = async (id, reason, ctx) => {
  const product = await prisma.product.findFirst({
    where: { id, deleted_at: null },
    select: { name: true, shop: { select: { owner_id: true } } },
  });
  if (!product) return null;

  const taken_down_at = new Date();
  await prisma.product.update({
    where: { id },
    data: { is_active: false, takedown_reason: reason, taken_down_at },
  });
  writeAuditLog({
    ...ctx,
    action: "PRODUCT_TAKEDOWN",
    resource: "product",
    resourceId: id,
    metadata: { reason },
  });
  notifyUser({
    userId: product.shop?.owner_id,
    title: "Product taken down",
    message: `Your product "${product.name}" was taken down for violating marketplace policy: ${reason}. Edit the listing and contact support to restore it.`,
    type: "SHOP",
    link: `/seller/products/${id}`,
  });
  return { id: Number(id), is_active: false, takedown_reason: reason, taken_down_at };
};
