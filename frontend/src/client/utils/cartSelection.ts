import type { CartItem } from '../types/cart'

// Luu cac dong gio hang NGUOI MUA BO CHON (khong phai dong da chon): dong moi
// them vao gio mac dinh duoc chon, id cu khong con trong gio thi vo hai.
const KEY = 'cart_excluded_items'

export const getExcluded = (): Set<number> => {
  try {
    return new Set(JSON.parse(sessionStorage.getItem(KEY) || '[]') as number[])
  } catch {
    return new Set()
  }
}

export const setExcluded = (ids: Set<number>) => {
  try {
    sessionStorage.setItem(KEY, JSON.stringify([...ids]))
  } catch {
    // private mode: chon/bo chon chi song trong trang hien tai
  }
}

// Dong dem di thanh toan: con hang va khong bi bo chon
export const selectedItems = (items: CartItem[], excluded: Set<number>) =>
  items.filter(i => !i.unavailable && !excluded.has(i.id))

// Cung cong thuc voi summarizeCart o backend (cart.controller.js)
export const summarizeItems = (items: CartItem[]) => {
  let original = 0
  let total = 0
  for (const i of items) {
    original += i.price * i.quantity // price tu backend da gom price_delta
    total += i.final_price * i.quantity
  }
  const r = (n: number) => Math.round(n * 100) / 100
  return { subtotal: r(original), total: r(total), discount: r(original - total) }
}
