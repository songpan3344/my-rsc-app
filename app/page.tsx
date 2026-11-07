import { Suspense } from 'react'
import { getPlatformFacts } from '@/lib/data'
import { Dashboard, DashboardFallback } from './components/dashboard'
import { GuestbookForm } from './components/guestbook-form'
import { LikeButton } from './components/like-button'

/**
 * 首页是 Server Component。getPlatformFacts() 带 'use cache'，参与构建期静态外壳预渲染。
 * searchParams 不在本组件 await，而是把 Promise 透传给包在 <Suspense> 里的 Dashboard，
 * 于是 hero / 交互岛 / footer 构成构建期静态外壳（秒开），仪表盘作为动态洞请求时流式渲染。
 */
export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ realtime?: string }>
}) {
  const facts = await getPlatformFacts()

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="mb-8">
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded-full border border-indigo-500/30 bg-indigo-500/10 px-3 py-1 text-[11px] font-medium text-indigo-300">
            Self-hosted SSR · Oracle Cloud Ampere A1
          </span>
          <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-medium text-emerald-300">
            ◐ 部分预渲染 · 流式传输
          </span>
        </div>
        <h1 className="mt-4 text-4xl font-bold tracking-tight text-slate-50 sm:text-5xl">
          RSC Lab
          <span className="ml-3 bg-gradient-to-r from-indigo-400 to-cyan-400 bg-clip-text text-transparent">
            家庭基础设施仪表盘
          </span>
        </h1>
        <p className="mt-4 max-w-3xl text-sm leading-relaxed text-slate-400">
          Next.js 16 服务端渲染与 React Server Components 的可运行示例，自托管部署在 panpan-oci-2，
          由现有域名与 Caddy 提供 HTTPS。本页故意用分级模拟延迟展示流式渲染：
          <strong className="text-slate-200">外壳秒开，数据区块按各自后端耗时陆续到达</strong>。
          下方瀑布图由客户端实测绘制；所有指标数字均为模拟演示数据。
        </p>

        <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-sm font-semibold text-slate-200">静态外壳（use cache · 构建期预渲染）</h2>
            <p className="font-mono text-xs text-slate-500">{facts.framework} · {facts.react}</p>
          </div>
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
        </div>
      </header>

      <Suspense fallback={<DashboardFallback />}>
        <Dashboard searchParams={searchParams} />
      </Suspense>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <GuestbookForm />
        <LikeButton />
      </div>

      <footer className="mt-12 border-t border-slate-800 pt-6 text-xs text-slate-500">
        <p>
          健康检查：<code className="font-mono text-slate-400">/api/health</code> ·
          四个区块各自独立 Suspense 边界流式推送 · 点「重播流式」反复观察 ·
          {'?realtime=1'} 切换零延迟对比
        </p>
      </footer>
    </main>
  )
}
