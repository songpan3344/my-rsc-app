export default function Loading() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-12">
      <div className="h-4 w-40 animate-pulse rounded bg-neutral-200" />
      <div className="mt-6 h-10 w-64 animate-pulse rounded bg-neutral-200" />
      <div className="mt-10 h-48 animate-pulse rounded-2xl bg-neutral-100" />
      <p className="mt-6 text-sm text-neutral-500">路由段正在加载（loading.tsx）…</p>
    </main>
  )
}
