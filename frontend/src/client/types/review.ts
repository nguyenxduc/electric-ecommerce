export type Review = {
  id: number
  user_id: number
  product_id: number
  rating: number
  comment: string
  created_at: string
  updated_at: string
  user: {
    id: number
    name: string
  }
}

export type ReviewRes = {
  reviews: Review[]
}
