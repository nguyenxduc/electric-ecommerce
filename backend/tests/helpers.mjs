// Shared helpers for the API test suites.
// Requires the backend running (npm run dev / node server.js) against a
// freshly seeded database (npm run seed).
export const API = process.env.API_URL || 'http://localhost:3000/api'

export const req = async (path, { method = 'GET', token, body } = {}) => {
  let res
  try {
    res = await fetch(API + path, {
      method,
      headers: {
        'Content-Type': 'application/json',
        // Frontend luon gui header nay (lib/axios.ts); thieu no bi cong diem
        // gian lan NO_DEVICE_ID, test khong nen mang diem do.
        'X-Device-Id': token ? `test-${token.slice(-24)}` : 'test-anon',
        ...(token && { Authorization: `Bearer ${token}` })
      },
      ...(body && { body: JSON.stringify(body) })
    })
  } catch (err) {
    throw new Error(
      `Cannot reach backend at ${API} - start it with "npm run dev" first (${err.message})`
    )
  }
  let json = null
  try {
    json = await res.json()
  } catch {}
  return { status: res.status, json }
}

const tokenCache = new Map()

export const login = async email => {
  if (tokenCache.has(email)) return tokenCache.get(email)
  const res = await req('/auth/login', {
    method: 'POST',
    body: { email, password: 'password123' }
  })
  const token = res.json?.data?.accessToken
  if (!token) {
    throw new Error(`Login failed for ${email}: ${JSON.stringify(res.json)}`)
  }
  tokenCache.set(email, token)
  return token
}

// Seeded demo accounts
export const ACCOUNTS = {
  admin: 'admin@example.com',
  seller1: 'seller1@example.com', // owns Tech World
  seller2: 'seller2@example.com', // owns Gadget Hub (shipping override 4.99/150)
  buyer: 'jane@example.com',
  buyer2: 'john@example.com',
  applicant: 'charlie@example.com' // plain user used for shop-application tests
}

export const round2 = n => Math.round(Number(n) * 100) / 100

// San pham co bien the (SKU) bat buoc gui variant_id; cac test cu dat hang
// khong kem bien the nen bo qua chung.
export const noVariants = p => !(p?.variants?.length)

export const firstProductOf = async (slug, sort = 'price-asc') => {
  const res = await req(`/shops/${slug}/products?limit=20&sort=${sort}`)
  return (res.json?.products ?? []).find(noVariants)
}

export const loyaltyPointsOf = async token =>
  Number((await req('/auth/me', { token })).json?.data?.loyalty_points ?? 0)
