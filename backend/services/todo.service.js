import { prisma } from "../lib/db.js";
import { ORDER_STATUS, RETURN_STATUS, SHOP_STATUS } from "../constants/status.js";
import { ROLES } from "../constants/roles.js";

// San pham con <= nguong nay bi coi la sap het hang (gom ca het hang)
export const LOW_STOCK_THRESHOLD = 5;

// Viec can xu ly cua mot shop (khoi "To-do" dau seller dashboard).
// ownerId de khong dem tin nhan cua chinh seller la "chua doc".
export const getShopTodo = async (shopId, ownerId) => {
  const order = { shop_id: shopId, deleted_at: null };
  const [to_confirm, to_ship, shipping, returns_pending, unread_messages, low_stock] =
    await Promise.all([
      prisma.order.count({ where: { ...order, status: ORDER_STATUS.PENDING } }),
      prisma.order.count({ where: { ...order, status: ORDER_STATUS.PROCESSING } }),
      prisma.order.count({ where: { ...order, status: ORDER_STATUS.SHIPPED } }),
      prisma.returnRequest.count({ where: { shop_id: shopId, status: RETURN_STATUS.PENDING } }),
      prisma.message.count({
        where: {
          is_read: false,
          deleted_at: null,
          sender_id: { not: ownerId },
          chat: { shop_id: shopId, deleted_at: null },
        },
      }),
      prisma.product.count({
        where: { shop_id: shopId, deleted_at: null, quantity: { lte: LOW_STOCK_THRESHOLD } },
      }),
    ]);
  return { to_confirm, to_ship, shipping, returns_pending, unread_messages, low_stock };
};

// Viec can xu ly cua admin san: duyet shop, chat ho tro, canh bao gian lan
export const getAdminTodo = async () => {
  const [shops_pending, unread_support, fraud_open] = await Promise.all([
    prisma.shop.count({ where: { status: SHOP_STATUS.PENDING, deleted_at: null } }),
    prisma.message.count({
      where: {
        is_read: false,
        deleted_at: null,
        sender: { role: { not: ROLES.ADMIN } },
        chat: { shop_id: null, deleted_at: null },
      },
    }),
    prisma.fraudFlag.count({ where: { status: "open" } }),
  ]);
  return { shops_pending, unread_support, fraud_open };
};
