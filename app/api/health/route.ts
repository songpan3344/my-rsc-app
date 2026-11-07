import { connection } from 'next/server'

// connection() 是 Next 16 的动态边界标记：确保该 Route Handler
// 不在构建期被静态化，每次请求都返回真实的运行时状态。
export async function GET() {
  await connection()

  return Response.json({
    ok: true,
    release: process.env.APP_VERSION ?? 'dev',
    node: process.version,
    time: new Date().toISOString(),
  })
}
