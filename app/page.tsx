import { Suspense } from 'react'
import { getPlatformFacts, getRuntimeInfo } from '@/lib/data'
import { GuestbookForm } from './components/guestbook-form'
import { LikeButton } from './components/like-button'

function StreamingSkeleton() {
  return (
    <section className="rounded-2xl border border-amber-200 bg-amber-50 p-6">
      <p className="text-xs font-semibold uppercase tracking-widest text-amber-700">
        动态区块 · 流式传输中
      </p>
      <div className="mt-5 space-y-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-amber-200" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-amber-200" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-amber-200" />
      </div>
      <p className="mt-5 text-xs leading-relaxed text-amber-800/80">
        这段内容在 Suspense 边界内由服务器随后推送，页面外壳不必等待它。
      </p>
    </section>
  )
}

// 异步 Server Component：数据获取在服务端完成，此组件代码不会进入浏览器 bundle
async function RuntimePanel() {
  const info = await getRuntimeInfo()

  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-emerald-700">
        运行时信息 · 请求时渲染
      </p>
      <dl className="mt-5 space-y-3 text-sm">
        <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">Node.js</dt>
          <dd className="font-mono text-neutral-900">{info.node}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">发布版本</dt>
          <dd className="font-mono text-neutral-900">{info.release}</dd>
        </div>
        <div className="flex justify-between gap-4 border-b border-neutral-100 pb-2">
          <dt className="text-neutral-500">进程 PID</dt>
          <dd className="font-mono text-neutral-900">{info.pid}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="shrink-0 text-neutral-500">渲染时刻</dt>
          <dd className="font-mono text-right text-neutral-900">{info.renderedAt}</dd>
        </div>
      </dl>
      <p className="mt-5 text-xs leading-relaxed text-neutral-500">
        这些值每次请求都会变化 —— 它们位于未缓存的动态洞中，而非构建期静态外壳。
      </p>
    </section>
  )
}

// 首页本身是 Server Component；getPlatformFacts() 带 'use cache'，参与静态外壳预渲染
export default async function Home() {
  const facts = await getPlatformFacts()

  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <header className="mb-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
          Self-hosted SSR · Oracle Cloud Ampere A1
        </p>
        <h1 className="mt-3 text-4xl font-bold tracking-tight text-neutral-900">RSC Lab</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-neutral-600">
          Next.js 16 服务端渲染与最新 React Server Components 特征的可运行示例，
          自托管部署在 panpan-oci-2，由现有域名与 Caddy 提供 HTTPS。
        </p>
      </header>

      <section className="rounded-2xl border border-indigo-100 bg-white p-6 shadow-sm">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-lg font-semibold text-neutral-900">静态外壳（use cache）</h2>
          <p className="font-mono text-xs text-neutral-500">
            {facts.framework} · {facts.react}
          </p>
        </div>
        <ul className="mt-5 grid gap-2 text-sm text-neutral-700 sm:grid-cols-2">
          {facts.features.map((feature) => (
            <li key={feature} className="flex items-center gap-2 rounded-lg bg-neutral-50 px-3 py-2">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-500" />
              {feature}
            </li>
          ))}
        </ul>
        <p className="mt-5 text-xs leading-relaxed text-neutral-500">
          整个列表由 Server Component 在服务端渲染并缓存，浏览器不会收到这部分组件代码。
        </p>
      </section>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <Suspense fallback={<StreamingSkeleton />}>
          <RuntimePanel />
        </Suspense>

        <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-widest text-neutral-500">
            服务端 / 客户端边界
          </p>
          <div className="mt-5 space-y-3 text-sm leading-relaxed text-neutral-700">
            <p>
              页面、布局、数据获取、RuntimePanel 都是 <strong>Server Components</strong>，
              可以直接读环境变量与进程信息，零客户端 JS。
            </p>
            <p>
              下方两个交互组件标记为 <code className="rounded bg-neutral-100 px-1 font-mono text-xs">&apos;use client&apos;</code>，
              只把必要的交互代码送到浏览器。
            </p>
          </div>
          <p className="mt-5 text-xs text-neutral-500">
            Server Actions 通过表单直接调用服务端函数，无需自建 API 路由。
          </p>
        </section>
      </div>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <GuestbookForm />
        <LikeButton />
      </div>

      <footer className="mt-12 border-t border-neutral-200 pt-6 text-xs text-neutral-500">
        <p>
          健康检查：<code className="font-mono">/api/health</code> · 流式区块由 Suspense 边界推送 ·
          每次刷新可观察动态区块延迟到达
        </p>
      </footer>
    </main>
  )
}
