import { useNavigate, useParams } from 'react-router-dom'
import { toast } from 'sonner'
import { useAdminCoupon, useUpdateAdminCoupon } from '../../hooks/useCoupons'
import { apiErrorMessage } from '../../../lib/apiError'
import CouponForm from './CouponForm'

export default function AdminCouponEdit() {
  const { id } = useParams()
  const navigate = useNavigate()

  const numericId = Number(id)
  const { data, isLoading } = useAdminCoupon(numericId)
  const updateMut = useUpdateAdminCoupon(numericId)

  return (
    <div className="space-y-4">
      <h1 className="text-xl font-semibold">{`Edit Coupon #${id}`}</h1>
      {isLoading || !data?.data ? (
        <div className="h-64 bg-gray-100 rounded animate-pulse" />
      ) : (
        <CouponForm
          // key: form nap lai khi doi sang voucher khac
          key={data.data.id}
          initial={data.data}
          submitLabel="Save changes"
          onCancel={() => navigate('/admin/coupons')}
          onSubmit={payload =>
            updateMut.mutate(payload, {
              onSuccess: () => {
                toast.success('Coupon updated')
                navigate('/admin/coupons')
              },
              onError: err => toast.error(apiErrorMessage(err, 'Failed to update coupon'))
            })
          }
        />
      )}
    </div>
  )
}
