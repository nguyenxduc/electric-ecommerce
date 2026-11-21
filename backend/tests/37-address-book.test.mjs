// So dia chi /api/addresses: CRUD, luon dung mot dia chi mac dinh, chong IDOR,
// gioi han 10 dia chi, SDT sai -> 400.
import test, { after, before } from 'node:test'
import assert from 'node:assert/strict'
import { req, login, ACCOUNTS } from './helpers.mjs'
import { prisma } from '../lib/db.js'

const buyer = await login(ACCOUNTS.buyer2)
const other = await login(ACCOUNTS.buyer)
const me = (await req('/auth/me', { token: buyer })).json.data

// Xoa cung so dia chi cua buyer de test lap lai duoc
const wipe = () => prisma.userAddress.deleteMany({ where: { user_id: BigInt(me.id) } })
before(wipe)
after(async () => {
  await wipe()
  await prisma.$disconnect()
})

const list = async () => (await req('/addresses', { token: buyer })).json.data
const create = (body, token = buyer) => req('/addresses', { method: 'POST', token, body })
const base = { name: 'John', phone: '0912 345 678', street: '1 Le Loi', province: 'HCM' }
const defaults = rows => rows.filter(a => a.is_default)

test('CRUD + mac dinh luon duy nhat', async () => {
  assert.equal((await req('/addresses')).status, 401)
  const a = await create(base)
  assert.equal(a.status, 201, JSON.stringify(a.json))
  assert.equal(a.json.data.is_default, true, 'dia chi dau tien la mac dinh')
  assert.equal(a.json.data.phone, '0912345678')
  const b = await create({ ...base, name: 'John 2', street: '2 Nguyen Hue' })
  assert.equal(b.json.data.is_default, false)

  const upd = await req(`/addresses/${b.json.data.id}`, { method: 'PATCH', token: buyer, body: { ward: 'Ben Nghe' } })
  assert.equal(upd.status, 200)
  assert.equal(upd.json.data.ward, 'Ben Nghe')
  assert.equal(upd.json.data.street, '2 Nguyen Hue')

  const def = await req(`/addresses/${b.json.data.id}/default`, { method: 'POST', token: buyer })
  assert.equal(def.status, 200)
  let rows = await list()
  assert.equal(defaults(rows).length, 1)
  assert.equal(rows[0].id, b.json.data.id, 'mac dinh dung dau danh sach')

  // Xoa dia chi mac dinh -> dia chi con lai duoc day len
  assert.equal((await req(`/addresses/${b.json.data.id}`, { method: 'DELETE', token: buyer })).status, 200)
  rows = await list()
  assert.equal(rows.length, 1)
  assert.equal(rows[0].id, a.json.data.id)
  assert.equal(rows[0].is_default, true)
})

test('nguoi khac thao tac tren dia chi -> 404', async () => {
  const id = (await list())[0].id
  assert.equal((await req(`/addresses/${id}`, { method: 'PATCH', token: other, body: { name: 'X' } })).status, 404)
  assert.equal((await req(`/addresses/${id}`, { method: 'DELETE', token: other })).status, 404)
  assert.equal((await req(`/addresses/${id}/default`, { method: 'POST', token: other })).status, 404)
  assert.ok(!(await req('/addresses', { token: other })).json.data.some(a => a.id === id))
  assert.equal((await list())[0].name, 'John')
})

test('validate: SDT sai, thieu ten, qua dai, id sai', async () => {
  assert.equal((await create({ ...base, phone: '12345' })).status, 400)
  assert.equal((await create({ ...base, name: '  ' })).status, 400)
  assert.equal((await create({ ...base, street: 'x'.repeat(256) })).status, 400)
  assert.equal((await create({ ...base, province: 'x'.repeat(101) })).status, 400)
  const id = (await list())[0].id
  assert.equal((await req(`/addresses/${id}`, { method: 'PATCH', token: buyer, body: { phone: 'abc' } })).status, 400)
  assert.equal((await req('/addresses/abc', { method: 'DELETE', token: buyer })).status, 400)
})

test('toi da 10 dia chi', async () => {
  const have = (await list()).length
  for (let i = have; i < 10; i++) assert.equal((await create({ ...base, street: `No ${i}` })).status, 201)
  const over = await create(base)
  assert.equal(over.status, 400)
  assert.match(over.json.message, /10/)
  const rows = await list()
  assert.equal(rows.length, 10)
  assert.equal(defaults(rows).length, 1)
})
