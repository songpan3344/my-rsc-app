'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <h1 className="text-2xl font-semibold text-neutral-900">渲染出错了</h1>
      <p className="mt-3 text-sm text-neutral-600">{error.message}</p>
      {error.digest && (
        <p className="mt-2 font-mono text-xs text-neutral-400">digest: {error.digest}</p>
      )}
      <button
        type="button"
        onClick={reset}
        className="mt-6 rounded-lg bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
      >
        重试
      </button>
    </main>
  )
}
