// /metrics: dinh dang Prometheus, ghi duoc request theo MAU route (khong lo id that).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { API } from './helpers.mjs'

const ROOT = API.replace(/\/api$/, '')

test('/metrics tra text Prometheus co metric mac dinh va histogram HTTP', async () => {
  await fetch(`${API}/products/999999999`) // sinh it nhat mot mau co tham so
  const res = await fetch(`${ROOT}/metrics`)
  assert.equal(res.status, 200)
  assert.match(res.headers.get('content-type'), /text\/plain/)
  const body = await res.text()
  assert.match(body, /process_cpu_seconds_total/)
  assert.match(body, /http_request_duration_seconds_bucket\{.*route="\/api\/products\/:id".*\}/)
  // Chi xet nhan route: gia tri so thuc (vd 0.0999999999) co the chua day chu so nay.
  assert.doesNotMatch(body, /route="[^"]*999999999/)
})
