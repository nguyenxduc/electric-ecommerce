// Probe cho Kubernetes: /healthz va /readyz nam ngoai /api, khong can dang nhap.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { API } from './helpers.mjs'

const ROOT = API.replace(/\/api$/, '')

test('/healthz tra 200 khong can token', async () => {
  const res = await fetch(`${ROOT}/healthz`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { status: 'ok' })
})

test('/readyz tra 200 khi DB san sang', async () => {
  const res = await fetch(`${ROOT}/readyz`)
  assert.equal(res.status, 200)
  assert.deepEqual(await res.json(), { status: 'ready' })
})

test('/api/health van chi danh cho admin', async () => {
  const res = await fetch(`${API}/health`)
  assert.equal(res.status, 401)
})
