'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * 流式瀑布监控（客户端交互岛）。
 * 用 MutationObserver 捕捉每个 [data-chunk-ready] 区块替换骨架的时刻，
 * 以 performance.now()（相对导航开始）记录到达时间，画成水平瀑布图。
 * 这直观证明：外壳/TTFB 很快，各区块按各自后端耗时陆续流式到达，而非整页等待。
 * 所有 DOM/performance 读取都在 useEffect 内，避免 SSR/CSR hydration 不一致。
 */

type Arrival = { id: string; label: string; ms: number; serverMs: number }

const ACCENT: Record<string, string> = {
  overview: 'bg-indigo-500',
  egress: 'bg-sky-500',
  traffic: 'bg-emerald-500',
  health: 'bg-amber-500',
}

export function StreamMonitor({
  realtime,
  chunkCount,
}: {
  realtime: boolean
  chunkCount: number
}) {
  const [arrivals, setArrivals] = useState<Arrival[]>([])
  const [ttfb, setTtfb] = useState<number | null>(null)
  const [hydration, setHydration] = useState<number | null>(null)
  const seen = useRef<Set<string>>(new Set())

  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as
      | PerformanceNavigationTiming
      | undefined
    if (nav) setTtfb(nav.responseStart)
    setHydration(performance.now())
    const ttfbMs = nav?.responseStart ?? 0

    const record = (el: Element, live: boolean) => {
      const id = el.getAttribute('data-chunk-ready')
      if (!id || seen.current.has(id)) return
      seen.current.add(id)
      const serverMs = Number(el.getAttribute('data-render-ms') ?? 0)
      // live：MutationObserver 实时捕捉，用真实客户端到达时刻。
      // 非 live：挂载前已到达（hydration 偏晚），用 TTFB+服务端耗时估算，避免全部记成挂载时刻。
      const ms = live ? performance.now() : Math.min(performance.now(), ttfbMs + serverMs)
      const arrival: Arrival = {
        id,
        label: el.getAttribute('data-label') ?? id,
        ms,
        serverMs,
      }
      setArrivals((prev) => [...prev, arrival].sort((a, b) => a.ms - b.ms))
    }

    // 兜底：挂载前已到达的区块（用服务端耗时估算其到达时刻）
    document.querySelectorAll('[data-chunk-ready]').forEach((el) => record(el, false))

    const observer = new MutationObserver((mutations) => {
      for (const m of mutations) {
        m.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node.matches('[data-chunk-ready]')) record(node, true)
          node.querySelectorAll('[data-chunk-ready]').forEach((el) => record(el, true))
        })
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    return () => observer.disconnect()
  }, [])

  const rows: { key: string; label: string; ms: number; color: string; hint?: string }[] = []
  if (ttfb != null) rows.push({ key: 'ttfb', label: '页面外壳 · TTFB', ms: ttfb, color: 'bg-slate-500', hint: '首字节到达，外壳即可见' })
  if (hydration != null) rows.push({ key: 'hyd', label: '可交互 · hydration', ms: hydration, color: 'bg-indigo-400', hint: '客户端 JS 接管' })
  for (const a of arrivals) {
    rows.push({ key: a.id, label: a.label, ms: a.ms, color: ACCENT[a.id] ?? 'bg-slate-400', hint: `服务端模拟耗时 ${a.serverMs}ms` })
  }
  const scale = Math.max(500, Math.ceil(Math.max(...rows.map((r) => r.ms), 0) / 500) * 500)
  const done = arrivals.length >= chunkCount

  return (
    <section className="rounded-2xl border border-slate-700 bg-gradient-to-b from-slate-900 to-slate-950 p-6 shadow-xl shadow-black/30">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${done ? 'bg-emerald-400' : 'animate-ping bg-indigo-400'} opacity-75`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-100">流式瀑布监控</h2>
            <p className="text-[11px] text-slate-500">相对导航开始的到达时刻 · 客户端实测</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 font-mono text-xs ${done ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'}`}>
          已到达 {arrivals.length}/{chunkCount} 区块
        </span>
      </div>

      <div className="mt-5 space-y-2.5">
        {rows.length === 0 && (
          <p className="text-xs text-slate-500">正在测量…</p>
        )}
        {rows.map((r) => (
          <div key={r.key} className="flex items-center gap-3" title={r.hint}>
            <span className="w-36 shrink-0 truncate text-xs text-slate-400 sm:w-44">{r.label}</span>
            <div className="h-4 flex-1 overflow-hidden rounded bg-slate-800/70">
              <div
                className={`flex h-full items-center justify-end rounded pr-1.5 ${r.color} transition-[width] duration-500 ease-out`}
                style={{ width: `${Math.max(2, Math.min(100, (r.ms / scale) * 100))}%` }}
              >
                <span className="font-mono text-[9px] font-semibold text-slate-950/80">
                  {Math.round(r.ms)}
                </span>
              </div>
            </div>
            <span className="w-16 shrink-0 text-right font-mono text-xs text-slate-300">
              {Math.round(r.ms)} ms
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-indigo-500"
        >
          ↻ 重播流式
        </button>
        <a
          href={realtime ? '/' : '/?realtime=1'}
          className="rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
        >
          {realtime ? '切回演示速度（分级延迟）' : '对比真实速度（零延迟）'}
        </a>
        <p className="ml-auto text-[11px] text-slate-600">
          {realtime ? '当前：真实速度，所有区块几乎同时到达' : '当前：分级模拟延迟，观察区块陆续到达'}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        要点：外壳与 TTFB 几乎 instant，页面立刻可见可交互；四个数据区块在各自独立的 Suspense 边界里，
        按模拟后端耗时（500 / 1100 / 1800 / 2600ms）陆续流式到达 —— 最慢的巡检区块绝不拖累最快的节点概览。
        这正是 SSR 流式渲染相对「整页等所有数据」的核心优势。
      </p>
    </section>
  )
}