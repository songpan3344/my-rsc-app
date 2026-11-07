'use client'

import { useEffect, useState } from 'react'
import { CHUNKS, chunkObservation, isChunkId, type Observation } from '../../lib/stream-metrics'

/** Browser milestones and DOM discovery, never inferred server/network arrival times. */

export function StreamMonitor({
  realtime,
  chunkCount,
}: {
  realtime: boolean
  chunkCount: number
}) {
  const [arrivals, setArrivals] = useState<Observation[]>([])
  const [ttfb, setTtfb] = useState<number | null>(null)
  const [fcp, setFcp] = useState<number | null>(null)
  const [mountedAt, setMountedAt] = useState<number | null>(null)

  useEffect(() => {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    setTtfb(nav && nav.responseStart > 0 ? nav.responseStart : null)
    setMountedAt(performance.now())
    const seen = new Map<string, Observation>()
    const record = (element: Element, phase: 'initial' | 'mutation') => {
      const id = element.getAttribute('data-chunk-ready')
      if (!isChunkId(id) || seen.has(id)) return
      seen.set(id, chunkObservation(id, phase, performance.now(), document.visibilityState === 'visible'))
      setArrivals(Array.from(seen.values()))
    }
    // No timestamp is inferred for preexisting nodes, even if data-render-ms is present.
    document.querySelectorAll('[data-chunk-ready]').forEach((element) => record(element, 'initial'))
    const observer = new MutationObserver((mutations) => {
      for (const mutation of mutations) {
        mutation.addedNodes.forEach((node) => {
          if (!(node instanceof Element)) return
          if (node.matches('[data-chunk-ready]')) record(node, 'mutation')
          node.querySelectorAll('[data-chunk-ready]').forEach((element) => record(element, 'mutation'))
        })
      }
    })
    observer.observe(document.body, { childList: true, subtree: true })
    const readPaints = (entries: PerformanceEntry[]) => {
      const entry = entries.find((item) => item.name === 'first-contentful-paint')
      if (entry) setFcp(entry.startTime)
    }
    readPaints(performance.getEntriesByType('paint'))
    let paintObserver: PerformanceObserver | undefined
    try {
      paintObserver = new PerformanceObserver((list) => readPaints(list.getEntries()))
      paintObserver.observe({ type: 'paint', buffered: true })
    } catch {
      // Unsupported or hidden-page paints stay unavailable, never fabricated as zero.
    }
    return () => { observer.disconnect(); paintObserver?.disconnect() }
  }, [])

  const rows = [
    { key: 'ttfb', label: '首字节 · TTFB', ms: ttfb, color: 'bg-slate-500', empty: '暂无数据', source: 'navigation', hint: '导航首字节，不代表此时已经绘制内容。' },
    { key: 'fcp', label: '首次内容绘制 · FCP', ms: fcp, color: 'bg-cyan-500', empty: '暂无数据', source: 'paint', hint: '浏览器 Paint Timing；隐藏页或不支持时可能没有记录。' },
    { key: 'mount', label: '监控挂载', ms: mountedAt, color: 'bg-violet-400', empty: '等待挂载', source: 'effect', hint: '仅本监控的 effect 开始执行，不代表整页水合完成或 INP。' },
    ...CHUNKS.map((chunk) => {
      const arrival = arrivals.find((item) => item.id === chunk.id)
      return {
        key: chunk.id, label: chunk.label, color: chunk.color, ms: arrival?.ms ?? null,
        source: arrival?.source ?? 'pending',
        empty: !arrival ? '等待区块' : arrival.source === 'background' ? '后台发现' : '挂载前已存在',
        hint: arrival?.source === 'dom-observed'
          ? 'MutationObserver 发现 DOM 节点的时刻；不等于网络首字节或可见绘制。'
          : '未观测到到达时刻，不用 TTFB + 模拟延迟推算；不绘制时间条。',
      }
    }),
  ]
  const scale = Math.max(500, Math.ceil(Math.max(...rows.map((row) => row.ms ?? 0)) / 500) * 500)
  const done = arrivals.length >= chunkCount

  return (
    <section id="stream-monitor" className="rounded-2xl border border-slate-700 bg-slate-900/70 p-4 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span className="relative flex h-2.5 w-2.5">
            <span className={`absolute inline-flex h-full w-full rounded-full ${done ? 'bg-emerald-400' : 'animate-ping bg-indigo-400'} opacity-75`} />
            <span className={`relative inline-flex h-2.5 w-2.5 rounded-full ${done ? 'bg-emerald-400' : 'bg-indigo-400'}`} />
          </span>
          <div>
            <h2 className="text-base font-semibold text-slate-100">流式瀑布监控</h2>
            <p className="text-[11px] text-slate-400">相对导航开始 · 浏览器指标与 DOM 观察</p>
          </div>
        </div>
        <span className={`rounded-full border px-3 py-1 font-mono text-xs ${done ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300' : 'border-indigo-500/30 bg-indigo-500/10 text-indigo-300'}`}>
          已发现 {arrivals.length}/{chunkCount} 区块
        </span>
      </div>

      <div className="mt-5 space-y-2">
        {rows.map((row) => (
          <div key={row.key} data-timing-row={row.key} data-timing-source={row.source}
            className="flex h-6 items-center gap-2" title={row.hint}>
            <span className="w-28 shrink-0 truncate text-[11px] text-slate-400 sm:w-40">{row.label}</span>
            <div className="h-3 min-w-0 flex-1 overflow-hidden rounded bg-slate-800">
              {row.ms != null && <div className={`h-full rounded ${row.color}`} style={{ width: `${Math.max(1, (row.ms / scale) * 100)}%` }} />}
            </div>
            <span className="w-24 shrink-0 text-right font-mono text-[11px] tabular-nums text-slate-300">
              {row.ms == null ? row.empty : `${Math.round(row.ms)} ms`}
            </span>
          </div>
        ))}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-800 pt-4">
        <button
          type="button"
          onClick={() => { window.scrollTo(0, 0); window.location.reload() }}
          className="rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-medium text-white transition hover:bg-indigo-500"
        >
          ↻ 重播流式
        </button>
        <a
          href={realtime ? '/' : '/?realtime=1'}
          className="rounded-lg border border-slate-700 bg-slate-800/60 px-3.5 py-2 text-xs font-medium text-slate-200 transition hover:bg-slate-700"
        >
          {realtime ? '分级延迟演示' : '零模拟延迟对照'}
        </a>
        <p className="ml-auto text-[11px] text-slate-600">
          {realtime ? '模拟数据 · 不额外等待' : '模拟延迟：500 / 1100 / 1800 / 2600ms'}
        </p>
      </div>

      <p className="mt-3 text-[11px] leading-relaxed text-slate-500">
        时间未知的区块只标记「挂载前已存在」或「后台发现」，不估算到达时刻。DOM 发现不等于已绘制；监控挂载不等于整页可交互。
        静态外壳和各数据区块可以分批传输，是否更早看见内容还取决于网络、样式和浏览器绘制。
      </p>
    </section>
  )
}