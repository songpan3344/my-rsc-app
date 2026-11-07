import { Suspense } from 'react'
import { getPlatformFacts } from '@/lib/data'
import { Dashboard, DashboardFallback } from './components/dashboard'
import { GuestbookForm } from './components/guestbook-form'
import { LikeButton } from './components/like-button'

/**
 * 首页是 Server Component。getPlatformFacts() 带 'use cache'，参与构建期静态外壳预渲染。
 * searchParams 不在本组件 await，而是把 Promise 透传给包在 <Suspense> 里的 Dashboard，
 * 于是 hero / 交互岛 / footer 构成构建期静态外壳（先于动态洞发出），仪表盘作为动态洞请求时流式渲染。
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ realtime?: string }>
}) {
  const facts = await getPlatformFacts()

  return (
    <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-8">
      <header className="mb-4 sm:mb-6">
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[11px] font-medium">
          <span className="text-indigo-300">Self-hosted SSR · OCI Ampere A1</span>
          <span className="text-slate-600">/</span>
          <span className="text-emerald-300">◐ 部分预渲染 · 流式传输</span>
        </p>
        <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-50 sm:text-4xl">
          RSC Lab
          <span className="ml-2 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent sm:ml-3">
            家庭基础设施仪表盘
          </span>
        </h1>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-400">
          静态外壳先发出，四个数据区块在各自 Suspense 边界里按模拟后端耗时分批传输。所有指标为模拟演示数据。
        </p>
      </header>

      <Suspense fallback={<DashboardFallback />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>

      <section data-platform-facts="" className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-slate-200">静态外壳（use cache · 构建期预渲染）</h2>
          <p className="font-mono text-xs text-slate-500">{facts.framework} · {facts.react}</p>
        </div>
        <p className="mt-2 text-xs leading-relaxed text-slate-500">
          Next.js 16 + React Server Components，自托管在 panpan-oci-2，由现有域名与 Caddy 提供 HTTPS。
        </p>
        <ul className="mt-4 flex flex-wrap gap-2">
          {facts.features.map((feature) => (
            <li
              key={feature}
              className="flex items-center gap-2 rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-1.5 text-xs text-slate-300"
            >
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              {feature}
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <GuestbookForm />
        <LikeButton />
      </div>

      <footer className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
        <p>
          健康检查：<code className="font-mono text-slate-400">/api/health</code> ·
          四个区块各自独立 Suspense 边界分批传输 · 点「重播流式」反复观察 ·
          {'?realtime=1'} 切换零模拟延迟对照
        </p>
      </footer>
    </main>
  )
}
