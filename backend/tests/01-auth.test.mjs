import test from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'

test('login succeeds with valid credentials and returns a token + user', async () => {
  const res = await req('/auth/login', {
    method: 'POST',
    body: { email: ACCOUNTS.buyer, password: 'password123' }
  })
  assert.equal(res.status, 200)
  assert.ok(res.json?.data?.accessToken, 'accessToken present')
  assert.equal(res.json?.data?.user?.email, ACCOUNTS.buyer)
})

test('login fails with a wrong password', async () => {
  const res = await req('/auth/login', {
    method: 'POST',
    body: { email: ACCOUNTS.buyer, password: 'wrong-password' }
  })
  assert.ok(res.status === 400 || res.status === 401, `status=${res.status}`)
})

test('login fails for an unknown account', async () => {
  const res = await req('/auth/login', {
    method: 'POST',
    body: { email: 'nobody@example.com', password: 'password123' }
  })
  assert.ok(res.status === 400 || res.status === 401 || res.status === 404)
})

test('GET /auth/me returns the profile of the token owner', async () => {
  const token = await login(ACCOUNTS.seller1)
  const res = await req('/auth/me', { token })
  assert.equal(res.status, 200)
  assert.equal(res.json?.data?.email, ACCOUNTS.seller1)
  assert.equal(res.json?.data?.role, 'seller')
})

test('GET /auth/me without a token is rejected', async () => {
  const res = await req('/auth/me')
  assert.equal(res.status, 401)
})

test('seeded roles are correct (admin / seller / user)', async () => {
  const roles = {
    [ACCOUNTS.admin]: 'admin',
    [ACCOUNTS.seller2]: 'seller',
    [ACCOUNTS.buyer2]: 'user'
  }
  for (const [email, expected] of Object.entries(roles)) {
    const token = await login(email)
    const me = await req('/auth/me', { token })
    assert.equal(me.json?.data?.role, expected, `${email} role`)
  }
})
