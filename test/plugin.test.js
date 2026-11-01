import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import vm from 'node:vm'
import { apply } from '../lib/index.js'

test('客户端 bundle 语法有效', () => {
  new vm.Script(readFileSync(new URL('../lib/client.js', import.meta.url), 'utf8'))
})

test('发现频道过滤规则帖、补足十条，并正确缓存与刷新', async (t) => {
  let handler
  apply({ inject: (_services, fn) => fn({
    effect: (fn) => fn(),
    webServer: { register: (route) => { handler = route.handler } },
  }) })
  const originalFetch = globalThis.fetch
  t.after(() => { globalThis.fetch = originalFetch })
  let calls = 0
  let broken = false
  const topics = ['内容提交规则（首先阅读）', ...Array.from({ length: 12 }, (_, i) => `分享 ${i + 1}`)]
  const markdown = topics.map((title, i) => `## [${title}](https://meta.appinn.net/t/topic/${100 + i})\n\n**回复:** ${i}\n`).join('\n---\n')
  globalThis.fetch = async (url) => {
    assert.equal(url, 'https://meta.appinn.net/c/faxian/10.md')
    calls++
    return { ok: true, text: async () => broken ? '# 无可用内容' : markdown }
  }
  async function request(query) {
    let status, body
    await handler({ url: `/dsh-hot-list/items?${query}` }, {
      writeHead: (value) => { status = value },
      end: (value) => { body = JSON.parse(value) },
    })
    return { status, body }
  }
  const first = await request('id=appinn-faxian')
  assert.equal(first.status, 200)
  assert.equal(first.body.items.length, 10)
  assert.deepEqual(first.body.items.map((item) => item.title), topics.slice(1, 11))
  assert.equal(first.body.items[0].extra.info, '1 条回复')
  assert.equal(first.body.items[9].url, 'https://meta.appinn.net/t/topic/110')
  await request('id=appinn-faxian')
  assert.equal(calls, 1)
  await request('id=appinn-faxian&refresh=1')
  assert.equal(calls, 2)
  broken = true
  assert.equal((await request('id=appinn-faxian&refresh=1')).status, 502)
  assert.equal((await request('id=../invalid')).status, 400)
})
