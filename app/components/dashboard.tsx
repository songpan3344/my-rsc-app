import { Suspense } from 'react'
import { getRuntimeInfo } from '@/lib/data'
import { StreamMonitor } from './stream-monitor'
import {
  OverviewWidget,
  EgressWidget,
  TrafficWidget,
  HealthWidget,
  WidgetSkeleton,
} from './dashboard-widgets'

/**
 * 动态洞：读取 searchParams（请求期数据），因此整块包在页面的 <Suspense> 边界里。
 * 构建期 prerender 会在此 suspend，把静态外壳（hero/交互岛/footer）先固化，
 * 请求时这一块再流式渲染 —— 这就是 Next 16 Cache Components 的部分预渲染（◐）。
 * searchParams 以 Promise 形式从 page 透传进来，在边界内 await。
 */
export async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ realtime?: string }>
}) {
  const sp = await searchParams
  const realtime = sp.realtime === '1'

  return (
    <div className="space-y-4 sm:space-y-6">
      <ModeBar realtime={realtime} />

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        <div data-widget-frame="overview">
          <Suspense fallback={<WidgetSkeleton id="overview" realtime={realtime} />}>
            <OverviewWidget realtime={realtime} />
          </Suspense>
        </div>
        <div data-widget-frame="egress">
          <Suspense fallback={<WidgetSkeleton id="egress" realtime={realtime} />}>
            <EgressWidget realtime={realtime} />
          </Suspense>
        </div>
        <div data-widget-frame="traffic">
          <Suspense fallback={<WidgetSkeleton id="traffic" realtime={realtime} />}>
            <TrafficWidget realtime={realtime} />
          </Suspense>
        </div>
        <div data-widget-frame="health">
          <Suspense fallback={<WidgetSkeleton id="health" realtime={realtime} />}>
            <HealthWidget realtime={realtime} />
          </Suspense>
        </div>
      </div>

      <StreamMonitor realtime={realtime} chunkCount={4} />

      <div className="grid gap-6 md:grid-cols-2">
        <Suspense fallback={<RuntimeSkeleton />}>
          <RuntimePanel />
        </Suspense>
        <BoundaryCard />
      </div>
    </div>
  )
}

/** 紧凑模式条：固定单行高度，静态占位与动态内容同高，切换模式不推动下方区块。 */
function ModeBar({ realtime }: { realtime: boolean | null }) {
  const label = realtime == null ? '读取模式…' : realtime ? '零模拟延迟对照' : '分级模拟延迟演示'
  return (
    <div className="flex h-9 items-center justify-between gap-3 overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 px-3 text-xs">
      <span className="truncate text-slate-300">
        <span className="text-slate-500">模式 </span>
        {label}
      </span>
      <span className="flex shrink-0 items-center gap-3">
        {realtime == null ? (
          <span className="text-slate-600">切换</span>
        ) : (
          <a href={realtime ? '/' : '/?realtime=1'} className="text-indigo-300 hover:text-indigo-200">
            切换
          </a>
        )}
        <a href="#stream-monitor" className="text-slate-400 hover:text-slate-200">
          瀑布 ↓
        </a>
      </span>
    </div>
  )
}

/** 静态外壳里为此动态洞预留的占位（构建期预渲染），请求时被 Dashboard 替换；顺序与高度和 Dashboard 一致。 */
export function DashboardFallback() {
  return (
    <div className="space-y-4 sm:space-y-6">
      <ModeBar realtime={null} />
      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {(['overview', 'egress', 'traffic', 'health'] as const).map((id) => (
          <div key={id} data-widget-frame={id}>
            <WidgetSkeleton id={id} realtime={false} />
          </div>
        ))}
      </div>
      <div
        data-monitor-placeholder=""
        className="rounded-2xl border border-slate-700 bg-slate-900/50 p-6"
      >
        <div className="h-4 w-40 animate-pulse rounded bg-slate-700" />
        <div className="mt-5 space-y-2.5">
          <div className="h-4 w-full animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-5/6 animate-pulse rounded bg-slate-800" />
          <div className="h-4 w-4/6 animate-pulse rounded bg-slate-800" />
        </div>
      </div>
    </div>
  )
}

function RuntimeSkeleton() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
      <div className="h-3 w-40 animate-pulse rounded bg-slate-700" />
      <div className="mt-5 space-y-3">
        <div className="h-3 w-2/3 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-1/2 animate-pulse rounded bg-slate-800" />
        <div className="h-3 w-3/5 animate-pulse rounded bg-slate-800" />
      </div>
    </section>
  )
}

async function RuntimePanel() {
  const info = await getRuntimeInfo()
  const rows = [
    ['Node.js', info.node],
    ['发布版本', info.release],
    ['进程 PID', String(info.pid)],
    ['渲染时刻', info.renderedAt],
  ]
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20">
      <p className="text-xs font-semibold uppercase tracking-widest text-violet-400">
        运行时信息 · 请求时渲染
      </p>
      <dl className="mt-5 space-y-3 text-sm">
        {rows.map(([k, v], i) => (
          <div
            key={k}
            className={`flex justify-between gap-4 ${i < rows.length - 1 ? 'border-b border-slate-800 pb-2' : ''}`}
          >
            <dt className="shrink-0 text-slate-500">{k}</dt>
            <dd className="truncate font-mono text-slate-200">{v}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        这些值每次请求都变化 —— 位于未缓存的动态洞，APP_VERSION 等运行时变量不会被构建期固化。
      </p>
    </section>
  )
}

function BoundaryCard() {
  return (
    <section className="rounded-2xl border border-slate-800 bg-slate-900/60 p-6 shadow-lg shadow-black/20">
      <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">
        服务端 / 客户端边界
      </p>
      <div className="mt-5 space-y-3 text-sm leading-relaxed text-slate-300">
        <p>
          页面、布局、数据获取、四个仪表盘区块都是{' '}
          <strong className="text-slate-100">Server Components</strong>
          ，直接读环境变量与进程信息，零客户端 JS。
        </p>
        <p>
          只有「流式瀑布监控」与下方两个交互组件标记为{' '}
          <code className="rounded bg-slate-800 px-1 font-mono text-xs">&apos;use client&apos;</code>
          ，把必要的交互代码送到浏览器。
        </p>
      </div>
      <p className="mt-5 text-xs text-slate-500">
        Server Actions 通过表单直接调用服务端函数，无需自建 API 路由。
      </p>
    </section>
  )
}