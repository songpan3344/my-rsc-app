import Link from 'next/link'

export default function NotFound() {
  return (
    <main className="mx-auto max-w-2xl px-6 py-16">
      <p className="font-mono text-sm text-neutral-400">404</p>
      <h1 className="mt-2 text-2xl font-semibold text-neutral-900">页面不存在</h1>
      <Link href="/" className="mt-6 inline-block text-sm text-indigo-600 underline">
        返回首页
      </Link>
    </main>
  )
}
