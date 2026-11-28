// Quen mat khau: khong lo email ton tai, ma bam dung mot lan, gioi han lan nhap sai,
// cooldown, va khong lam hong OTP so dien thoai (cung bang otp_codes).
import test, { after } from 'node:test'
import assert from 'node:assert/strict'
import bcrypt from 'bcryptjs'
import { req, ACCOUNTS } from './helpers.mjs'
import { prisma } from '../lib/db.js'

const EMAIL = ACCOUNTS.buyer2
const ORIGINAL = 'password123'
const NEW_PASSWORD = 'n3w-Secret!'
const user = await prisma.user.findUnique({ where: { email: EMAIL } })

const forgot = email => req('/auth/forgot-password', { method: 'POST', body: { email } })
const reset = (code, new_password = NEW_PASSWORD, email = EMAIL) =>
  req('/auth/reset-password', { method: 'POST', body: { email, code, new_password } })
const login = password => req('/auth/login', { method: 'POST', body: { email: EMAIL, password } })
// Lui ma cu ra ngoai cooldown 60s de xin ma moi ngay trong test
const skipCooldown = () =>
  prisma.otpCode.updateMany({
    where: { user_id: user.id, purpose: 'reset_password' },
    data: { created_at: new Date(Date.now() - 61_000) }
  })

await prisma.otpCode.deleteMany({ where: { user_id: user.id, purpose: 'reset_password' } })
after(async () => {
  await prisma.otpCode.deleteMany({ where: { user_id: user.id, purpose: 'reset_password' } })
  await prisma.user.update({
    where: { id: user.id },
    data: { password_digest: await bcrypt.hash(ORIGINAL, 10) }
  })
  await prisma.$disconnect()
})

test('email khong ton tai nhan cung cau tra loi, khong co ma; email sai dang 400', async () => {
  const missing = await forgot('nobody-here@example.com')
  assert.equal(missing.status, 200)
  assert.equal(missing.json.data.dev_code, undefined)
  assert.equal((await forgot('not-an-email')).status, 400)
  assert.equal((await forgot(undefined)).status, 400)

  const real = await forgot(EMAIL)
  assert.equal(real.status, 200)
  assert.equal(real.json.message, missing.json.message, 'cau tra loi phai giong het')
  assert.match(real.json.data.dev_code, /^\d{6}$/)
})

test('cooldown: xin ma lai ngay lap tuc khong tao ma moi, tra loi giong email khong ton tai', async () => {
  const before = await prisma.otpCode.count({ where: { user_id: user.id, purpose: 'reset_password' } })
  const again = await forgot(EMAIL)
  assert.equal(again.status, 200, '429 se lo email ton tai')
  assert.equal(again.json.data.dev_code, undefined)
  assert.equal(await prisma.otpCode.count({ where: { user_id: user.id, purpose: 'reset_password' } }), before)
})

test('ma luu dang bam, khong luu plaintext', async () => {
  const row = await prisma.otpCode.findFirst({
    where: { user_id: user.id, purpose: 'reset_password' },
    orderBy: { created_at: 'desc' }
  })
  assert.match(row.code_hash, /^[0-9a-f]{64}$/)
})

test('nhap sai 5 lan thi ma bi khoa, ke ca nhap dung sau do', async () => {
  await skipCooldown()
  const { dev_code: code } = (await forgot(EMAIL)).json.data
  const wrong = code === '000000' ? '111111' : '000000'
  for (let i = 0; i < 5; i++) assert.equal((await reset(wrong)).status, 400)
  assert.equal((await reset(code)).status, 429)
  assert.equal((await login(ORIGINAL)).status, 200, 'mat khau chua bi doi')
})

test('du lieu sai: mat khau ngan / ma khong phai 6 so -> 400', async () => {
  await skipCooldown()
  const { dev_code: code } = (await forgot(EMAIL)).json.data
  assert.equal((await reset(code, '123')).status, 400)
  assert.equal((await reset('12ab')).status, 400)
  assert.equal((await reset(code, NEW_PASSWORD, 'nobody-here@example.com')).status, 400)
})

test('ma dung: doi mat khau, dang nhap bang mat khau moi, ma khong dung lai duoc', async () => {
  await skipCooldown()
  const { dev_code: code } = (await forgot(EMAIL)).json.data
  const ok = await reset(code)
  assert.equal(ok.status, 200, JSON.stringify(ok.json))
  assert.equal((await login(ORIGINAL)).status, 401)
  assert.equal((await login(NEW_PASSWORD)).status, 200)
  assert.equal((await reset(code, 'another-pass')).status, 400, 'ma chi dung mot lan')

  const audit = await prisma.auditLog.findFirst({
    where: { user_id: user.id, action: 'RESET_PASSWORD' },
    orderBy: { created_at: 'desc' }
  })
  assert.ok(audit, 'phai ghi audit log')
})

test('ma quen mat khau khong chan OTP so dien thoai', async () => {
  await skipCooldown()
  await forgot(EMAIL)
  const token = (await login(NEW_PASSWORD)).json.data.accessToken
  const otp = await req('/auth/phone/otp', { method: 'POST', token, body: { phone: '0912345678' } })
  assert.notEqual(otp.status, 429, JSON.stringify(otp.json))
  await prisma.otpCode.deleteMany({ where: { user_id: user.id, purpose: 'verify_phone' } })
})
