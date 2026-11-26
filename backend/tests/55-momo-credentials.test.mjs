// Khoa MoMo: production thieu khoa thi fail closed, khong roi ve khoa sandbox cong khai.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { momoCredentials } from '../lib/momo.js'

test('production thieu khoa -> null (khong dung khoa sandbox)', () => {
  assert.equal(momoCredentials({ NODE_ENV: 'production' }), null)
  assert.equal(momoCredentials({ NODE_ENV: 'production', MOMO_SECRET_KEY: 'x' }), null)
})

test('ngoai production thieu khoa -> khoa sandbox de dev/test chay duoc', () => {
  const c = momoCredentials({})
  assert.equal(c.partnerCode, 'MOMO')
  assert.ok(c.accessKey && c.secretKey)
})

test('co du khoa -> dung khoa da cau hinh, ca o production', () => {
  const c = momoCredentials({
    NODE_ENV: 'production',
    MOMO_PARTNER_CODE: 'SHOP1',
    MOMO_ACCESS_KEY: 'ak',
    MOMO_SECRET_KEY: 'sk'
  })
  assert.deepEqual(c, { partnerCode: 'SHOP1', accessKey: 'ak', secretKey: 'sk' })
})
