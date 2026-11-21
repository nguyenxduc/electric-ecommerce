import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  claimCoupon,
  getMyCoupons,
  quoteCoupons,
  type VoucherCart
} from '../services/couponService'
import { getShopVouchers } from '../services/shopService'

export const useMyVouchers = () =>
  useQuery({
    queryKey: ['coupons', 'my'],
    queryFn: getMyCoupons,
    staleTime: 60 * 1000
  })

export const useShopVouchers = (slug: string) =>
  useQuery({
    queryKey: ['shop-vouchers', slug],
    queryFn: () => getShopVouchers(slug)
  })

// Danh sach voucher cho gio hang hien tai (checkout)
export const useVoucherQuote = (cart: VoucherCart, enabled: boolean) =>
  useQuery({
    queryKey: ['coupons', 'quote', cart],
    queryFn: () => quoteCoupons(cart),
    enabled
  })

// Luu voucher: lam moi kho, danh sach cua shop va danh sach o checkout
export const useClaimVoucher = () => {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: claimCoupon,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['coupons'] })
      qc.invalidateQueries({ queryKey: ['shop-vouchers'] })
    }
  })
}
