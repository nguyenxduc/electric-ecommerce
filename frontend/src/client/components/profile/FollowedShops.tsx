import { Link } from 'react-router-dom'
import { Store } from 'lucide-react'
import { toast } from 'sonner'
import { useFollowedShops } from '../../hooks/useShopFollow'
import { useQueryClient, useMutation } from '@tanstack/react-query'
import { unfollowShop } from '../../services/shopService'
import { apiErrorMessage } from '../../../lib/apiError'

export default function FollowedShops() {
  const qc = useQueryClient()
  const { data: shops = [], isLoading } = useFollowedShops()
  const unfollow = useMutation({
    mutationFn: unfollowShop,
    onSuccess: (_d, slug) => {
      qc.invalidateQueries({ queryKey: ['followed-shops'] })
      qc.invalidateQueries({ queryKey: ['shop', slug] })
      toast.success('Unfollowed')
    },
    onError: err => toast.error(apiErrorMessage(err, 'Could not unfollow'))
  })

  if (isLoading) return <p className="text-gray-500">Loading...</p>
  if (shops.length === 0) {
    return <p className="text-gray-500">You are not following any shop yet.</p>
  }

  return (
    <div className="space-y-3">
      <h2 className="text-lg font-semibold">Followed shops</h2>
      {shops.map(s => (
        <div key={s.id} className="flex items-center gap-4 bg-white border rounded-xl p-4">
          <div className="w-12 h-12 rounded-full border bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
            {s.logo_url ? (
              <img src={s.logo_url} alt={s.name} className="w-full h-full object-cover" />
            ) : (
              <Store className="w-5 h-5 text-gray-400" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <Link to={`/shop/${s.slug}`} className="font-medium text-gray-900 hover:underline truncate block">
              {s.name}
            </Link>
            <p className="text-xs text-gray-500">
              {s.product_count} products · {s.follower_count} followers
            </p>
          </div>
          <button
            onClick={() => unfollow.mutate(s.slug)}
            disabled={unfollow.isPending}
            className="px-3 py-1.5 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
          >
            Unfollow
          </button>
        </div>
      ))}
    </div>
  )
}
