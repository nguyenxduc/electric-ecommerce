import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'
import type { CartItem } from '../../types/cart'
import { groupCartItemsByShop } from '../../utils/groupCartItemsByShop'
import { makeProductSlug } from '../../utils/productSlug'
import { formatPrice } from '../../utils/formatMoney'

interface CartProps {
  cartProducts: CartItem[]
  // Bam vao san pham thi dong popup gio hang
  onNavigate?: () => void
}

// Danh sach mon trong popup gio hang, gom theo shop giong trang Cart/Checkout
// (moi shop la mot don rieng khi thanh toan).
const CartContent = ({ cartProducts, onNavigate }: CartProps) => {
  if (!cartProducts?.length) return null
  const groups = groupCartItemsByShop(cartProducts)

  return (
    <div className="space-y-4">
      {groups.map(group => (
        <section key={group.key}>
          <h4 className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-gray-500">
            <Store className="h-3.5 w-3.5" aria-hidden />
            {group.shopName}
          </h4>
          <ul className="divide-y divide-gray-100">
            {group.items.map(item => {
              const finalPrice =
                item.final_price || item.unit_final_price || item.price || 0
              const hasDiscount = item.discount > 0 && item.price > finalPrice
              const meta = [item.variant?.name, item.color?.name]
                .filter(Boolean)
                .join(' · ')
              return (
                <li key={item.id}>
                  <Link
                    to={`/product/${makeProductSlug(item.name, item.product_id)}`}
                    onClick={onNavigate}
                    className={`-mx-2 flex items-center gap-3 rounded-xl px-2 py-2.5 hover:bg-paper ${
                      item.unavailable ? 'opacity-60' : ''
                    }`}
                  >
                    <span className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl bg-paper">
                      {item.image_url ? (
                        <img
                          src={item.image_url}
                          alt=""
                          className="h-full w-full object-contain p-1 mix-blend-multiply"
                        />
                      ) : (
                        <span className="text-[10px] text-gray-400">
                          No image
                        </span>
                      )}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-ink">
                        {item.name}
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-gray-500">
                        {item.unavailable ? (
                          <span className="text-red-600">
                            No longer available
                          </span>
                        ) : (
                          <>
                            {meta && `${meta} · `}Qty {item.quantity}
                          </>
                        )}
                      </span>
                    </span>
                    <span className="shrink-0 text-right">
                      <span className="price block text-sm font-semibold text-ink">
                        {formatPrice(finalPrice * item.quantity)}
                      </span>
                      {hasDiscount && (
                        <span className="price block text-xs text-gray-400 line-through">
                          {formatPrice(item.price * item.quantity)}
                        </span>
                      )}
                    </span>
                  </Link>
                </li>
              )
            })}
          </ul>
        </section>
      ))}
    </div>
  )
}

export default CartContent
