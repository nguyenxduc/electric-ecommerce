import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { followShop, unfollowShop, getFollowedShops, type Shop } from '../services/shopService'

// Bam la doi ngay (optimistic) tren cache ['shop', slug]; loi thi hoan lai
export const useToggleFollow = (slug: string) => {
  const qc = useQueryClient()
  const key = ['shop', slug]
  return useMutation({
    mutationFn: (follow: boolean) => (follow ? followShop(slug) : unfollowShop(slug)),
    onMutate: async (follow: boolean) => {
      await qc.cancelQueries({ queryKey: key })
      const prev = qc.getQueryData<Shop>(key)
      if (prev) {
        qc.setQueryData<Shop>(key, {
          ...prev,
          is_following: follow,
          follower_count: Math.max(0, (prev.follower_count ?? 0) + (follow ? 1 : -1))
        })
      }
      return { prev }
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(key, ctx.prev)
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: key })
      qc.invalidateQueries({ queryKey: ['followed-shops'] })
    }
  })
}

export const useFollowedShops = () =>
  useQuery({
    queryKey: ['followed-shops'],
    queryFn: () => getFollowedShops({ limit: 50 }),
    enabled: !!localStorage.getItem('accessToken'),
    retry: false
  })
