import axiosClient from '../../lib/axios'

export type WishlistItem = {
  id: string
  product: {
    id: string
    name: string
    price: string
    discount: string
    img: string[]
    rating: string | null
  }
  created_at: string
}

export type WishlistResponse = {
  items: WishlistItem[]
  totalItems: number
}

export const getWishlist = async (): Promise<WishlistResponse> => {
  const { data } = await axiosClient.get<WishlistResponse>('/wishlist')
  return data
}

export const addToWishlist = async (productId: number): Promise<{ message: string; items: WishlistItem[] }> => {
  const { data } = await axiosClient.post<{ message: string; items: WishlistItem[] }>('/wishlist/add', {
    productId
  })
  return data
}

export const removeFromWishlist = async (productId: number): Promise<{ message: string }> => {
  const { data } = await axiosClient.delete<{ message: string }>(`/wishlist/remove/${productId}`)
  return data
}

export const clearWishlist = async (): Promise<{ message: string }> => {
  const { data } = await axiosClient.delete<{ message: string }>('/wishlist/clear')
  return data
}

