// Chatbot: Gemini treo truoc chunk dau thi huy va goi lai mot lan; khong lap chu khi da phat token.
// Dung model gia (khong goi Gemini), nen test chay nhanh va on dinh.
import test from 'node:test'
import assert from 'node:assert/strict'
import { runModelTurn } from '../ai/agent.js'

const chunk = content => ({ content, concat(other) { return chunk(content + other.content) } })

// attempts: moi phan tu la 'hang' (treo toi khi bi huy) hoac mang cac manh chu
const fakeModel = attempts => {
  let call = 0
  return {
    calls: () => call,
    async stream(_messages, { signal } = {}) {
      const plan = attempts[call++]
      return (async function* () {
        if (plan === 'hang') {
          await new Promise((_, reject) => {
            signal.addEventListener('abort', () => reject(Object.assign(new Error('aborted'), { name: 'AbortError' })))
          })
        }
        for (const piece of plan) yield chunk(piece)
      })()
    }
  }
}

test('treo truoc chunk dau: huy va goi lai mot lan, tra ve ket qua lan hai', async () => {
  const model = fakeModel(['hang', ['Xin ', 'chao']])
  const tokens = []
  const res = await runModelTurn(model, [], t => tokens.push(t), 50)
  assert.equal(model.calls(), 2)
  assert.equal(res.content, 'Xin chao')
  assert.deepEqual(tokens, ['Xin ', 'chao'])
})

test('treo ca hai lan: nem loi de agent tra loi du phong', async () => {
  const model = fakeModel(['hang', 'hang'])
  await assert.rejects(runModelTurn(model, [], () => {}, 30), /No first chunk/)
  assert.equal(model.calls(), 2)
})

test('co chunk ngay: khong goi lai', async () => {
  const model = fakeModel([['ok']])
  const res = await runModelTurn(model, [], () => {}, 50)
  assert.equal(res.content, 'ok')
  assert.equal(model.calls(), 1)
})
