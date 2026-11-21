interface OrderMoney {
  total: number
  shippingFee?: number
  products: { price?: number; quantity?: number }[]
}

export const orderSubtotal = (o: OrderMoney) =>
  o.products.reduce((s, p) => s + Number(p.price ?? 0) * (p.quantity ?? 1), 0)

// Giam gia (voucher/hang thanh vien) = tam tinh + phi ship - tong thanh toan
export const orderDiscount = (o: OrderMoney) =>
  Math.max(0, Math.round((orderSubtotal(o) + (o.shippingFee ?? 0) - o.total) * 100) / 100)
