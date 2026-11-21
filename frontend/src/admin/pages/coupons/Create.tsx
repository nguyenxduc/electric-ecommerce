import { useNavigate } from 'react-router-dom'
import { toast } from 'sonner'
import { useCreateAdminCoupon } from '../../hooks/useCoupons'
import { apiErrorMessage } from '../../../lib/apiError'
import CouponForm from './CouponForm'

export default function AdminCouponCreate() {
  const navigate = useNavigate()
  const createMut = useCreateAdminCoupon()

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">New Coupon</h1>
      <CouponForm
        submitLabel="Create"
        onCancel={() => navigate('/admin/coupons')}
        onSubmit={payload =>
          createMut.mutate(payload, {
            onSuccess: () => {
              toast.success('Coupon created')
              navigate('/admin/coupons')
            },
            onError: err => toast.error(apiErrorMessage(err, 'Failed to create coupon'))
          })
        }
      />
    </div>
  )
}
