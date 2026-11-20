export type Category = {
  id: number
  description: string
  image_url: string
  name: string
  slug: string
  sub_categories?: { id: number; name: string }[]
}

export type Categories = Category[]
