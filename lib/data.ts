import { cacheLife, cacheTag } from 'next/cache'
import { connection } from 'next/server'

/**
 * 缓存函数：'use cache' 让返回值跨请求复用，并参与构建期静态外壳预渲染。
 * cacheLife('days') 给出缓存生命周期，cacheTag 提供按需失效的句柄。
 * 注意：这里只能放真正静态的内容 —— 构建时预渲染会固化闭包捕获的值。
 */
export async function getPlatformFacts() {
  'use cache'
  cacheLife('days')
  cacheTag('platform-facts')

  return {
    framework: 'Next.js 16.4.5',
    react: 'React 19.3.1',
    features: [
      'Server Components 默认',
      'Cache Components + use cache',
      'Server Actions (useActionState)',
      'Suspense 流式渲染',
      'React Compiler 1.0',
      'proxy.ts 请求边界',
    ],
  } as const
}

/**
 * 未缓存的动态函数：读取运行时环境变量与当前时间。
 * 必须放在 <Suspense> 边界内，由请求时流式返回 —— 这也保证 APP_VERSION
 * 等运行时变量不会被构建期固化。
 */
export async function getRuntimeInfo() {
  // 显式声明为请求期动态数据：避免预渲染期读取 new Date() 触发
  // blocking-prerender 错误（Next 16 Cache Components）。
  await connection()

  // 演示用模拟慢查询：默认关闭，生产不为演示白付延迟。
  // 本地想展示流式效果时设 DEMO_LATENCY_MS=900。
  const delayMs = Number(process.env.DEMO_LATENCY_MS ?? 0)
  if (Number.isFinite(delayMs) && delayMs > 0) {
    await new Promise((resolve) => setTimeout(resolve, delayMs))
  }

  return {
    node: process.version,
    release: process.env.APP_VERSION ?? 'dev',
    renderedAt: new Date().toISOString(),
    pid: process.pid,
  }
}
