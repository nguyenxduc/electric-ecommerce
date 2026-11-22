import { useEffect, useLayoutEffect, useRef, useState, type RefObject } from 'react'
import { createPortal } from 'react-dom'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, ShoppingBag, X } from 'lucide-react'
import CartContent from '../cart/CartContent'

import CartIcon from '../../../assets/cart-icon.svg'
import { Cart, CartItem } from '../../types/cart'

type PopoverProps = {
  anchorRef: RefObject<HTMLButtonElement | null>
  onClose(): void
  cartItemCount: number
  totalCost: number
  cartProducts: CartItem[]
}

// Popup gio hang neo duoi header. Khong lam toi/mo nen trang: lop phu trong
// suot chi de bat click ra ngoai thi dong. Portal ra body vi header co
// backdrop-blur: backdrop-filter bien header thanh khung chua cua moi phan tu
// position:fixed ben trong, lop phu se chi phu dai header (bam giua trang
// khong dong duoc popup).
function CartPopover({ anchorRef, onClose, cartItemCount, totalCost, cartProducts }: PopoverProps) {
  const navigate = useNavigate()
  // Neo mep phai popup thang mep phai nut gio hang. Truoc day dung right-8 theo
  // cua so, nen o man rong (noi dung header gioi han max-w-7xl) popup dat ra tan
  // mep man hinh, cach nut hang tram px.
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null)
  useLayoutEffect(() => {
    const place = () => {
      const r = anchorRef.current?.getBoundingClientRect()
      if (!r) return
      // Khong de popup tran mep trai tren man hep (popup rong min(400, 100vw - 32))
      const vw = window.innerWidth
      const width = Math.min(400, vw - 32)
      const right = Math.max(16, Math.min(vw - r.right, vw - 16 - width))
      setPos({ top: r.bottom + 8, right })
    }
    place()
    window.addEventListener('resize', place)
    return () => window.removeEventListener('resize', place)
  }, [anchorRef])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose])

  return createPortal(
    <div className="fixed inset-0 z-[60]" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Shopping cart"
        style={pos ? { top: pos.top, right: pos.right, maxHeight: `calc(100vh - ${pos.top + 24}px)` } : undefined}
        className="fixed right-4 top-[72px] flex max-h-[calc(100vh-96px)] w-[calc(100vw-2rem)] max-w-[400px] flex-col overflow-hidden rounded-2xl bg-white shadow-[0_24px_60px_-24px_rgb(23_24_27/0.35)] ring-1 ring-gray-200/80"
        onClick={e => e.stopPropagation()}
      >
        <header className="flex items-center justify-between px-5 pb-3 pt-4">
          <h3 className="text-base font-semibold text-ink">
            Your cart
            {cartItemCount > 0 && (
              <span className="ml-2 text-sm font-normal text-gray-500">
                {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
              </span>
            )}
          </h3>
          <button
            onClick={onClose}
            aria-label="Close cart"
            className="-mr-1.5 rounded-full p-1.5 text-gray-400 hover:bg-paper hover:text-ink"
          >
            <X className="h-4 w-4" />
          </button>
        </header>

        {cartItemCount > 0 ? (
          <>
            <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-2">
              <CartContent cartProducts={cartProducts} onNavigate={onClose} />
            </div>
            <footer className="border-t border-gray-100 px-5 pb-5 pt-4">
              <div className="flex items-baseline justify-between">
                <span className="text-sm text-gray-600">Subtotal</span>
                <span className="price text-lg font-semibold text-ink">
                  ${(typeof totalCost === 'number' ? totalCost : 0).toFixed(2)}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-500">Shipping and vouchers are applied at checkout.</p>
              <button
                className="btn-primary mt-4 w-full py-3"
                onClick={() => {
                  navigate('/cart')
                  onClose()
                }}
              >
                View cart
                <ArrowRight className="h-4 w-4" />
              </button>
            </footer>
          </>
        ) : (
          <div className="flex flex-col items-center px-5 pb-8 pt-4 text-center">
            <span className="flex h-12 w-12 items-center justify-center rounded-full bg-paper">
              <ShoppingBag className="h-5 w-5 text-gray-500" />
            </span>
            <p className="mt-3 text-sm font-medium text-ink">Your cart is empty</p>
            <p className="mt-1 text-xs text-gray-500">Add some products to get started.</p>
            <Link to="/collection/all" onClick={onClose} className="btn-secondary mt-5">
              Shop all products
            </Link>
          </div>
        )}
      </div>
    </div>,
    document.body
  )
}

interface CartProps {
  cartProducts: Cart | null
}

const CartDrawer = ({ cartProducts }: CartProps) => {
  const [drawerOpen, setDrawerOpen] = useState(false)
  const buttonRef = useRef<HTMLButtonElement>(null)
  const count = cartProducts?.total_items ?? 0

  return (
    <div>
      {drawerOpen && (
        <CartPopover
          anchorRef={buttonRef}
          onClose={() => setDrawerOpen(false)}
          cartItemCount={count}
          totalCost={cartProducts?.total_price ?? 0}
          cartProducts={cartProducts?.items ?? []}
        />
      )}
      <button
        ref={buttonRef}
        className="icon-btn"
        onClick={() => setDrawerOpen(!drawerOpen)}
        aria-label={count ? `Cart, ${count} items` : 'Cart'}
        aria-expanded={drawerOpen}
      >
        <img src={CartIcon} alt="" className="h-9 w-9" />
        {count > 0 && (
          <span className="absolute -right-1 -top-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-blue-600 px-1 text-xs text-white">
            {count}
          </span>
        )}
      </button>
    </div>
  )
}

export default CartDrawer
