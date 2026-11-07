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
 * 分级模拟延迟：这是一个「演示站」，故意让不同区块模拟不同耗时的后端，
 * 以直观展示流式渲染 —— 外壳秒开，区块按各自节奏陆续到达。
 * realtime=true（?realtime=1）时所有延迟归零，用于对比真实速度。
 * 每个动态函数都先 await connection()，避免预渲染期读取 new Date()
 * 触发 blocking-prerender 错误（Next 16 Cache Components）。
 */
async function simulate(ms: number, realtime: boolean) {
  await connection()
  const effective = realtime ? 0 : ms
  if (effective > 0) {
    await new Promise((resolve) => setTimeout(resolve, effective))
  }
  return effective
}

/** 各区块的模拟后端耗时（毫秒），刻意拉开梯度便于观察流式瀑布。 */
export const STAGGER = {
  overview: 500,
  egress: 1100,
  traffic: 1800,
  health: 2600,
} as const

export type ChunkMeta = {
  /** 实际生效的模拟延迟（realtime 时为 0），随区块一起流式下发 */
  latencyMs: number
  renderedAt: string
}

/** 区块一：家庭核心节点概览（最快到达）。数字为模拟演示数据。 */
export async function getOverview(realtime: boolean): Promise<
  ChunkMeta & {
    nodes: {
      id: string
      name: string
      role: string
      addr: string
      cpu: number
      mem: number
      uptimeDays: number
    }[]
  }
> {
  const latencyMs = await simulate(STAGGER.overview, realtime)
  return {
    latencyMs,
    renderedAt: new Date().toISOString(),
    nodes: [
      { id: 'pi', name: 'Orange Pi 5 Plus', role: '家庭核心 · 存储 / 虚拟化', addr: '192.168.1.3', cpu: 23, mem: 61, uptimeDays: 42 },
      { id: 'raspberry', name: 'Raspberry Pi 3B', role: '全屋 DNS · 监控', addr: '192.168.1.147', cpu: 11, mem: 38, uptimeDays: 128 },
      { id: 'haos', name: 'Home Assistant OS', role: '智能家居中枢 (KVM)', addr: '192.168.1.32', cpu: 17, mem: 52, uptimeDays: 42 },
      { id: 'oci2', name: 'OCI Ampere A1', role: '本站宿主 · 2 OCPU / 12G', addr: '129.146.226.175', cpu: 8, mem: 29, uptimeDays: 4 },
    ],
  }
}

/** 区块二：全球出口延迟（中等耗时）。RTT 为模拟演示数据。 */
export async function getEgress(realtime: boolean): Promise<
  ChunkMeta & {
    exits: { id: string; flag: string; name: string; region: string; rtt: number; note: string }[]
  }
> {
  const latencyMs = await simulate(STAGGER.egress, realtime)
  return {
    latencyMs,
    renderedAt: new Date().toISOString(),
    exits: [
      { id: 'korea', flag: '🇰🇷', name: 'panpan-korea', region: '首尔', rtt: 38, note: 'Xray Reality' },
      { id: 'india', flag: '🇮🇳', name: 'panpan-india', region: '孟买', rtt: 96, note: 'Xray Reality' },
      { id: 'oci2', flag: '🇺🇸', name: 'panpan-oci-2', region: '美西 · 本站', rtt: 142, note: 'Always Free' },
      { id: 'oci', flag: '🇺🇸', name: 'panpan-oci', region: '美西', rtt: 151, note: 'A1.Flex' },
      { id: 'gcp', flag: '🇺🇸', name: 'gcp-micro', region: '美国 GCP', rtt: 168, note: 'e2-micro' },
    ],
  }
}

/** 区块三：24h 出口流量趋势（较慢）。确定性模拟数据，服务端渲染 SVG。 */
export async function getTraffic(realtime: boolean): Promise<
  ChunkMeta & { points: number[]; totalGb: number; peakGb: number }
> {
  const latencyMs = await simulate(STAGGER.traffic, realtime)
  // 确定性的「昼夜双峰」曲线，避免随机数导致每次刷新图形跳动
  const points = Array.from({ length: 24 }, (_, h) => {
    const morning = 18 * Math.exp(-((h - 9) ** 2) / 8)
    const evening = 30 * Math.exp(-((h - 21) ** 2) / 6)
    const base = 4 + 2 * Math.sin(h / 2)
    return Math.round((base + morning + evening) * 10) / 10
  })
  const totalGb = Math.round(points.reduce((a, b) => a + b, 0) * 10) / 10
  const peakGb = Math.max(...points)
  return { latencyMs, renderedAt: new Date().toISOString(), points, totalGb, peakGb }
}

/** 区块四：服务健康深度巡检（最慢到达）。结果为模拟演示数据。 */
export async function getHealth(realtime: boolean): Promise<
  ChunkMeta & {
    services: { name: string; host: string; port: string; ok: boolean; ms: number }[]
  }
> {
  const latencyMs = await simulate(STAGGER.health, realtime)
  return {
    latencyMs,
    renderedAt: new Date().toISOString(),
    services: [
      { name: 'HAProxy · SNI 分流', host: 'oci-2', port: ':443', ok: true, ms: 2 },
      { name: 'Xray Reality', host: 'oci-2', port: ':8443', ok: true, ms: 5 },
      { name: 'Caddy · TLS', host: 'oci-2', port: ':9443', ok: true, ms: 3 },
      { name: 'Next.js (Docker)', host: 'oci-2', port: ':3000', ok: true, ms: 12 },
      { name: 'AdGuard Home', host: 'raspberry', port: ':53', ok: true, ms: 1 },
      { name: 'Uptime Kuma', host: 'raspberry', port: ':3001', ok: true, ms: 8 },
      { name: 'Immich', host: 'pi', port: ':2283', ok: true, ms: 26 },
      { name: 'Samba', host: 'pi', port: ':445', ok: true, ms: 4 },
    ],
  }
}

/**
 * 未缓存的动态函数：读取运行时环境变量与当前时间。
 * 必须放在 <Suspense> 边界内，由请求时流式返回 —— 这也保证 APP_VERSION
 * 等运行时变量不会被构建期固化。
 */
export async function getRuntimeInfo() {
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