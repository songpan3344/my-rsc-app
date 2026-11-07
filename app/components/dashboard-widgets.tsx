import {
  getOverview,
  getEgress,
  getTraffic,
  getHealth,
  STAGGER,
  type ChunkMeta,
} from '@/lib/data'

/**
 * 这些区块都是异步 Server Component：数据获取在服务端完成，组件代码不进浏览器 bundle。
 * 每个区块的最外层带 data-chunk-ready / data-label / data-render-ms，
 * 供客户端「流式瀑布监控」用 MutationObserver 捕捉到达时刻。
 * 页面把它们各自包在独立 <Suspense> 边界里，于是慢区块不会拖累快区块。
 */

const CARD =
  'h-full rounded-2xl border border-slate-800 bg-slate-900/60 p-4 shadow-lg shadow-black/20 sm:p-6'

function Chunk({
  id,
  label,
  latencyMs,
  children,
}: {
  id: string
  label: string
  latencyMs: number
  children: React.ReactNode
}) {
  return (
    <div className="h-full" data-chunk-ready={id} data-label={label} data-render-ms={latencyMs}>
      {children}
    </div>
  )
}

function MetaBadge({ meta, accent }: { meta: ChunkMeta; accent: string }) {
  return (
    <span
      className={`rounded-full border px-2.5 py-1 font-mono text-[11px] ${accent}`}
      title={`服务端渲染时刻 ${meta.renderedAt}`}
    >
      {meta.latencyMs > 0 ? `模拟后端 ${meta.latencyMs}ms` : '零模拟延迟'}
    </span>
  )
}

function Bar({ value, max, className }: { value: number; max: number; className: string }) {
  const pct = Math.min(100, Math.round((value / max) * 100))
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
      <div className={`h-full rounded-full ${className}`} style={{ width: `${pct}%` }} />
    </div>
  )
}

/* ───────────────────────── 区块一：节点概览 ───────────────────────── */

export async function OverviewWidget({ realtime }: { realtime: boolean }) {
  const data = await getOverview(realtime)
  return (
    <Chunk id="overview" label="节点概览" latencyMs={data.latencyMs}>
      <section className={`${CARD} @container`}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-indigo-400">
              流式区块 · 最快到达
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">家庭核心节点</h2>
          </div>
          <MetaBadge meta={data} accent="border-indigo-500/30 bg-indigo-500/10 text-indigo-300" />
        </div>

        <div className="mt-4 grid gap-3 @sm:grid-cols-2 sm:mt-5">
          {data.nodes.map((n) => (
            <div key={n.id} className="rounded-xl border border-slate-800 bg-slate-950/40 p-4">
              <div className="flex items-center justify-between gap-2">
                <p className="truncate text-sm font-medium text-slate-100">{n.name}</p>
                <span className="flex shrink-0 items-center gap-1.5 text-[11px] text-emerald-400">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
                  在线
                </span>
              </div>
              <p className="mt-0.5 truncate text-xs text-slate-500">{n.role}</p>
              <p className="mt-1 font-mono text-[11px] text-slate-400">{n.addr}</p>
              <div className="mt-3 space-y-2">
                <div className="flex items-center gap-2">
                  <span className="w-8 text-[10px] text-slate-500">CPU</span>
                  <Bar value={n.cpu} max={100} className="bg-indigo-500" />
                  <span className="w-9 text-right font-mono text-[10px] text-slate-400">{n.cpu}%</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-8 text-[10px] text-slate-500">MEM</span>
                  <Bar value={n.mem} max={100} className="bg-sky-500" />
                  <span className="w-9 text-right font-mono text-[10px] text-slate-400">{n.mem}%</span>
                </div>
              </div>
              <p className="mt-2 text-[10px] text-slate-600">已运行 {n.uptimeDays} 天 · 模拟指标</p>
            </div>
          ))}
        </div>
      </section>
    </Chunk>
  )
}

/* ───────────────────────── 区块二：全球出口延迟 ───────────────────────── */

export async function EgressWidget({ realtime }: { realtime: boolean }) {
  const data = await getEgress(realtime)
  const maxRtt = Math.max(...data.exits.map((e) => e.rtt))
  return (
    <Chunk id="egress" label="全球出口延迟" latencyMs={data.latencyMs}>
      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-sky-400">
              流式区块 · 独立边界
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">全球出口 RTT</h2>
          </div>
          <MetaBadge meta={data} accent="border-sky-500/30 bg-sky-500/10 text-sky-300" />
        </div>

        <div className="mt-5 space-y-3">
          {data.exits.map((e) => (
            <div key={e.id} className="flex items-center gap-3">
              <span className="w-6 text-center text-lg leading-none">{e.flag}</span>
              <div className="w-32 shrink-0">
                <p className="truncate font-mono text-xs text-slate-200">{e.name}</p>
                <p className="truncate text-[10px] text-slate-500">{e.region} · {e.note}</p>
              </div>
              <div className="flex-1">
                <Bar value={e.rtt} max={maxRtt} className="bg-gradient-to-r from-sky-500 to-cyan-400" />
              </div>
              <span className="w-16 text-right font-mono text-xs text-slate-300">{e.rtt} ms</span>
            </div>
          ))}
        </div>
        <p className="mt-4 text-[11px] text-slate-600">
          自家庭宽带至各出口的往返时延 · 模拟演示数据，非实测
        </p>
      </section>
    </Chunk>
  )
}

/* ───────────────────────── 区块三：流量趋势（SVG） ───────────────────────── */

function TrafficChart({ points }: { points: number[] }) {
  const W = 720
  const H = 200
  const padX = 8
  const padY = 12
  const max = Math.max(...points) * 1.1
  const innerW = W - padX * 2
  const innerH = H - padY * 2
  const x = (i: number) => padX + (i / (points.length - 1)) * innerW
  const y = (v: number) => padY + innerH - (v / max) * innerH
  const line = points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ')
  const area = `${line} L${x(points.length - 1).toFixed(1)},${(padY + innerH).toFixed(1)} L${x(0).toFixed(1)},${(padY + innerH).toFixed(1)} Z`
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="mt-4 w-full" role="img" aria-label="24 小时出口流量趋势">
      <defs>
        <linearGradient id="trafficFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10b981" stopOpacity="0.45" />
          <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
        </linearGradient>
      </defs>
      {[0.25, 0.5, 0.75].map((g) => (
        <line key={g} x1={padX} x2={W - padX} y1={padY + innerH * g} y2={padY + innerH * g} stroke="#1e293b" strokeWidth="1" />
      ))}
      <path d={area} fill="url(#trafficFill)" />
      <path d={line} fill="none" stroke="#34d399" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.map((v, i) => (
        <circle key={i} cx={x(i)} cy={y(v)} r="2" fill="#6ee7b7" />
      ))}
    </svg>
  )
}

export async function TrafficWidget({ realtime }: { realtime: boolean }) {
  const data = await getTraffic(realtime)
  return (
    <Chunk id="traffic" label="流量趋势" latencyMs={data.latencyMs}>
      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-emerald-400">
              流式区块 · 服务端 SVG
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">24h 出口流量</h2>
          </div>
          <MetaBadge meta={data} accent="border-emerald-500/30 bg-emerald-500/10 text-emerald-300" />
        </div>

        <TrafficChart points={data.points} />
        <div className="mt-1 flex justify-between font-mono text-[10px] text-slate-600">
          <span>00:00</span><span>06:00</span><span>12:00</span><span>18:00</span><span>23:00</span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">累计</p>
            <p className="mt-1 font-mono text-xl text-emerald-300">{data.totalGb} <span className="text-xs text-slate-500">GB</span></p>
          </div>
          <div className="rounded-xl border border-slate-800 bg-slate-950/40 p-3">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">峰值时段</p>
            <p className="mt-1 font-mono text-xl text-emerald-300">{data.peakGb} <span className="text-xs text-slate-500">GB/h</span></p>
          </div>
        </div>
        <p className="mt-3 text-[11px] text-slate-600">
          图表完全由 Server Component 渲染为 SVG，零客户端绘图库 · 模拟数据
        </p>
      </section>
    </Chunk>
  )
}

/* ───────────────────────── 区块四：服务健康巡检 ───────────────────────── */

export async function HealthWidget({ realtime }: { realtime: boolean }) {
  const data = await getHealth(realtime)
  const okCount = data.services.filter((s) => s.ok).length
  return (
    <Chunk id="health" label="服务健康巡检" latencyMs={data.latencyMs}>
      <section className={CARD}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-amber-400">
              流式区块 · 最慢到达
            </p>
            <h2 className="mt-1 text-lg font-semibold text-slate-100">服务健康巡检</h2>
          </div>
          <MetaBadge meta={data} accent="border-amber-500/30 bg-amber-500/10 text-amber-300" />
        </div>

        <p className="mt-3 text-xs text-slate-400">
          <span className="font-mono text-emerald-400">{okCount}/{data.services.length}</span> 项正常 ·
          此区块模拟最慢的后端，但完全不阻塞上方区块
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {data.services.map((s) => (
            <div key={s.name} className="flex items-center justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950/40 px-3 py-2">
              <div className="flex min-w-0 items-center gap-2">
                <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${s.ok ? 'bg-emerald-400' : 'bg-red-400'}`} />
                <div className="min-w-0">
                  <p className="truncate text-xs text-slate-200">{s.name}</p>
                  <p className="truncate font-mono text-[10px] text-slate-500">{s.host}{s.port}</p>
                </div>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-slate-400">{s.ms}ms</span>
            </div>
          ))}
        </div>
        <p className="mt-3 text-[11px] text-slate-600">巡检结果为模拟演示数据 · 真实监控见 Uptime Kuma</p>
      </section>
    </Chunk>
  )
}

/* ───────────────────────── 骨架（Suspense fallback） ───────────────────────── */

const SKELETON_ACCENT: Record<string, { text: string; bar: string; border: string }> = {
  overview: { text: 'text-indigo-400', bar: 'bg-indigo-500/30', border: 'border-indigo-500/20' },
  egress: { text: 'text-sky-400', bar: 'bg-sky-500/30', border: 'border-sky-500/20' },
  traffic: { text: 'text-emerald-400', bar: 'bg-emerald-500/30', border: 'border-emerald-500/20' },
  health: { text: 'text-amber-400', bar: 'bg-amber-500/30', border: 'border-amber-500/20' },
}

const LABELS: Record<string, string> = {
  overview: '节点概览',
  egress: '全球出口延迟',
  traffic: '流量趋势',
  health: '服务健康巡检',
}

export function WidgetSkeleton({ id, realtime }: { id: keyof typeof STAGGER; realtime: boolean }) {
  const a = SKELETON_ACCENT[id]
  const ms = realtime ? 0 : STAGGER[id]
  return (
    <section
      data-chunk-skeleton={id}
      className={`h-full rounded-2xl border ${a.border} bg-slate-900/40 p-4 shadow-lg shadow-black/20 sm:p-6`}
    >
      <div className="flex items-center justify-between gap-2">
        <p className={`text-xs font-semibold uppercase tracking-widest ${a.text}`}>
          {LABELS[id]} · 等待分批传输
        </p>
        <span className="rounded-full border border-slate-700 bg-slate-800/60 px-2.5 py-1 font-mono text-[11px] text-slate-400">
          {ms > 0 ? `模拟后端 ${ms}ms` : '零模拟延迟'}
        </span>
      </div>
      <div className="mt-5 space-y-3">
        <div className={`h-3 w-2/3 animate-pulse rounded ${a.bar}`} />
        <div className={`h-3 w-1/2 animate-pulse rounded ${a.bar}`} />
        <div className={`h-3 w-4/5 animate-pulse rounded ${a.bar}`} />
        <div className={`h-3 w-3/5 animate-pulse rounded ${a.bar}`} />
      </div>
      <p className="mt-5 text-xs leading-relaxed text-slate-500">
        此区块在独立 Suspense 边界内，数据就绪后由服务器在同一响应里分批传输，不阻塞其它区块。
      </p>
    </section>
  )
}