import { Heart } from 'lucide-react'
import { toast } from 'sonner'
import { useToggleFollow } from '../../hooks/useShopFollow'
import { openLoginModal } from '../../utils/loginModal'
import { apiErrorMessage } from '../../../lib/apiError'
import type { Shop } from '../../services/shopService'

// Nut Theo doi / Dang theo doi kem so nguoi theo doi; khach bam thi mo modal dang nhap
const FollowButton = ({ shop }: { shop: Shop }) => {
  const toggle = useToggleFollow(shop.slug)
  if (shop.is_owner) return null
  const following = !!shop.is_following

  const onClick = () => {
    if (!localStorage.getItem('accessToken')) return openLoginModal()
    toggle.mutate(!following, {
      onError: err => toast.error(apiErrorMessage(err, 'Could not update follow'))
    })
  }

  return (
    <button
      onClick={onClick}
      aria-pressed={following}
      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm rounded-lg border ${
        following
          ? 'border-gray-300 text-gray-700 bg-gray-50 hover:bg-gray-100'
          : 'border-pink-500 text-pink-600 hover:bg-pink-50'
      }`}
    >
      <Heart className={`w-4 h-4 ${following ? 'fill-pink-500 text-pink-500' : ''}`} />
      {following ? 'Following' : 'Follow'}
      <span className="text-xs text-gray-500">({shop.follower_count ?? 0})</span>
    </button>
  )
}

export default FollowButton
