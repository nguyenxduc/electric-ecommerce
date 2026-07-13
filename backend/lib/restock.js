// Returns items of an order back to stock (per-color + aggregate quantity)
// and rolls back the sold counter. `db` can be prisma or a $transaction tx.
export const restockOrderItems = async (db, items) => {
  for (const item of items) {
    let colorObj = null;
    if (typeof item.color === "string") {
      try {
        colorObj = JSON.parse(item.color);
      } catch {
        colorObj = null;
      }
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
