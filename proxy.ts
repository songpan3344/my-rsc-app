import { NextResponse, type NextRequest } from 'next/server'

// Next.js 16：proxy.ts 取代 middleware.ts，位于请求边界。
// 注意：它不是安全边界 —— Server Actions 必须自行做认证与授权。
// 这里只做滥用缓解（限流），不做鉴权。

// 进程内固定窗口限流：仅针对 Server Action 的 POST（带 Next-Action 头）。
// 单副本演示够用；多副本需换共享存储（Redis 等）。
const WINDOW_MS = 60_000
const MAX_HITS = 10
const hits = new Map<string, { count: number; reset: number }>()

function clientIp(request: NextRequest): string {
  // Caddy reverse_proxy 会把真实客户端 IP 追加到 X-Forwarded-For 末尾，
  // 取最后一段以避免客户端伪造首段。
  const xff = request.headers.get('x-forwarded-for')
  if (xff) return xff.split(',').pop()!.trim()
  return 'local'
}

export function proxy(request: NextRequest) {
  if (request.method === 'POST' && request.headers.get('next-action')) {
    const ip = clientIp(request)
    const now = Date.now()
    const entry = hits.get(ip)
    if (!entry || now > entry.reset) {
      hits.set(ip, { count: 1, reset: now + WINDOW_MS })
    } else {
      entry.count += 1
      if (entry.count > MAX_HITS) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: { 'Retry-After': String(Math.ceil((entry.reset - now) / 1000)) },
        })
      }
    }
    // 防止内存无限增长（演示规模足够）
    if (hits.size > 10_000) hits.clear()
  }

  const response = NextResponse.next()
  response.headers.set('x-rsc-lab', 'next16')
  return response
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|robots.txt).*)'],
}
