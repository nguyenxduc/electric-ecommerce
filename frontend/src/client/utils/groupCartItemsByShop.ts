import type { CartItem } from '../types/cart'

export type ShopCartGroup = {
  key: string
  shopName: string
  shopSlug?: string
  items: CartItem[]
}

// Groups cart items by selling shop. Checkout creates one order per shop,
// so Cart and Checkout must present the same grouping.
export const groupCartItemsByShop = (items: CartItem[]): ShopCartGroup[] => {
  const groups = new Map<string, ShopCartGroup>()
  for (const item of items) {
    const key = item.shop ? String(item.shop.id) : 'marketplace'
    if (!groups.has(key)) {
      groups.set(key, {
        key,
        shopName: item.shop?.name || 'Marketplace',
        shopSlug: item.shop?.slug,
        items: []
      })
    }
    groups.get(key)!.items.push(item)
  }
  return [...groups.values()]
}
