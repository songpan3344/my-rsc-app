export const CHUNKS = [
  { id: 'overview', label: '节点概览', color: 'bg-indigo-500' },
  { id: 'egress', label: '全球出口延迟', color: 'bg-sky-500' },
  { id: 'traffic', label: '流量趋势', color: 'bg-emerald-500' },
  { id: 'health', label: '服务健康巡检', color: 'bg-amber-500' },
] as const

export type ChunkId = (typeof CHUNKS)[number]['id']
export type Observation = {
  id: ChunkId
  source: 'preexisting' | 'dom-observed' | 'background'
  ms: number | null
  observedAt: number
}

export function isChunkId(value: string | null): value is ChunkId {
  return CHUNKS.some((chunk) => chunk.id === value)
}

/** DOM discovery is not network arrival or paint; never infer time from server delay. */
export function chunkObservation(
  id: ChunkId,
  phase: 'initial' | 'mutation',
  observedAt: number,
  visible: boolean,
): Observation {
  const source = phase === 'initial' ? 'preexisting' : visible ? 'dom-observed' : 'background'
  return { id, source, ms: source === 'dom-observed' ? observedAt : null, observedAt }
}
