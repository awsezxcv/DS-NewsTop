// dsh-hot-list · host 侧
//
// 作用：把 NewsNow 的热搜 API 代理成同源接口，让浏览器侧边栏面板可以直接
// fetch。上游 (newsnow.busiyi.world) 不发送 CORS 头，浏览器直连会被拦截；
// 这里由宿主进程（Node）代为请求并加上内存缓存，避免频繁打上游。

const UPSTREAM = 'https://newsnow.busiyi.world/api/s'
const UA =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36'
const TTL_MS = 60_000 // 单个源的内存缓存时长

/** id -> { at: number, data: unknown } */
const cache = new Map()

function sendJson(response, status, payload) {
  const body = JSON.stringify(payload)
  response.writeHead(status, {
    'cache-control': 'no-store',
    'content-type': 'application/json; charset=utf-8',
    'content-length': Buffer.byteLength(body),
  })
  response.end(body)
}

async function fetchAppinn() {
  const response = await fetch('https://meta.appinn.net/c/faxian/10.md', {
    headers: { 'user-agent': UA, accept: 'text/markdown' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`appinn HTTP ${response.status}`)
  const markdown = await response.text()
  const headings = [...markdown.matchAll(/^## \[(.+)\]\((https:\/\/meta\.appinn\.net\/t\/[^\s)]+)\)[ \t]*$/gm)]
  const items = headings.map((match, index) => {
    const end = headings[index + 1]?.index ?? markdown.length
    const metadata = markdown.slice(match.index + match[0].length, end)
    const replies = metadata.match(/\*\*回复:\*\* (\d+)/)?.[1]
    return {
      id: match[2],
      title: match[1].replace(/\\([\\`*_[\]{}()#+.!>-])/g, '$1'),
      url: match[2],
      ...(replies ? { extra: { info: `${replies} 条回复` } } : {}),
    }
  }).filter((item) => !item.title.startsWith('内容提交规则')).slice(0, 10)
  if (!items.length) throw new Error('appinn topic list unavailable')
  return { id: 'appinn-faxian', status: 'success', updatedTime: Date.now(), items }
}

async function fetchUpstream(id) {
  const url = `${UPSTREAM}?id=${encodeURIComponent(id)}`
  const response = await fetch(url, {
    headers: { 'user-agent': UA, accept: 'application/json' },
    signal: AbortSignal.timeout(15_000),
  })
  if (!response.ok) throw new Error(`upstream HTTP ${response.status}`)
  return await response.json()
}

export const name = 'dsh-hot-list'

export function apply(ctx) {
  ctx.inject(['webServer'], (host) => {
    host.effect(
      () => {
        const dispose = host.webServer.register({
          kind: 'exact',
          path: '/dsh-hot-list/items',
          handler: async (request, response) => {
            try {
              const url = new URL(request.url, 'http://localhost')
              const id = url.searchParams.get('id') || 'weibo'
              // 只允许简单的小写字母/数字/连字符 id，作为固定上游的查询参数，
              // 请求只发往固定的 NewsNow 或小众软件社区地址。
              if (!/^[a-z0-9-]{1,64}$/.test(id)) {
                sendJson(response, 400, { error: 'invalid source id' })
                return
              }
              const now = Date.now()
              const hit = cache.get(id)
              if (url.searchParams.get('refresh') !== '1' && hit && now - hit.at < TTL_MS) {
                sendJson(response, 200, hit.data)
                return
              }
              const data = id === 'appinn-faxian' ? await fetchAppinn() : await fetchUpstream(id)
              if (!Array.isArray(data.items)) throw new Error('source temporarily unavailable')
              cache.set(id, { at: now, data })
              sendJson(response, 200, data)
            } catch (error) {
              sendJson(response, 502, { error: error?.message || String(error) })
            }
          },
        })
        return () => {
          if (typeof dispose === 'function') dispose()
        }
      },
      'dsh-hot-list: http routes',
    )
  })
}
