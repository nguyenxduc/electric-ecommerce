const KEY = 'recentlyViewed'
const MAX = 20

// Danh sach id san pham da xem, moi nhat dau; luu theo trinh duyet
export const getRecentlyViewed = (): number[] => {
  try {
    const raw = JSON.parse(localStorage.getItem(KEY) || '[]')
    return Array.isArray(raw) ? raw.filter(n => Number.isInteger(n)).slice(0, MAX) : []
  } catch {
    return []
  }
}

export const addRecentlyViewed = (id: number) => {
  try {
    const next = [id, ...getRecentlyViewed().filter(x => x !== id)].slice(0, MAX)
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    /* localStorage bi chan: bo qua */
  }
}

export const clearRecentlyViewed = () => {
  try {
    localStorage.removeItem(KEY)
  } catch {
    /* bo qua */
  }
}
