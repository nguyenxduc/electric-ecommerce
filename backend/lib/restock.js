import { stockLockKey, compareStockLockKey } from "./stockLock.js";

const parseColor = (raw) => {
  if (typeof raw !== "string") return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
};

// Returns items of an order back to stock (per-color + aggregate quantity)
// and rolls back the sold counter. `db` can be prisma or a $transaction tx.
//
// Khoa dong theo cung thu tu voi buoc tru kho cua checkout (xem
// lib/stockLock.js): sap mon theo (product_id, variant_id, mau), trong moi mon
// bien the -> mau -> san pham. Truoc day hoan kho theo thu tu mon trong don va
// khoa mau truoc bien the, nen chay song song voi checkout thi deadlock.
export const restockOrderItems = async (db, items) => {
  const lines = items
    .map((item) => ({ item, colorObj: parseColor(item.color) }))
    .sort((a, b) =>
      compareStockLockKey(
        stockLockKey({ productId: a.item.product_id, variantId: a.item.variant_id, color: a.colorObj }),
        stockLockKey({ productId: b.item.product_id, variantId: b.item.variant_id, color: b.colorObj })
      )
    );

  for (const { item, colorObj } of lines) {
    if (item.variant_id) {
      await db.productVariant.update({
        where: { id: item.variant_id },
        data: { quantity: { increment: item.quantity } },
      });
    }

    if (colorObj && (colorObj.code || colorObj.name)) {
      await db.productColor.updateMany({
        where: {
          product_id: item.product_id,
          OR: [
            colorObj.code ? { code: colorObj.code } : undefined,
            colorObj.name ? { name: colorObj.name } : undefined,
          ].filter(Boolean),
        },
        data: { quantity: { increment: item.quantity } },
      });
    }

    await db.product.update({
      where: { id: item.product_id },
      data: {
        quantity: { increment: item.quantity },
        sold: { decrement: item.quantity },
      },
    });
  }
};
