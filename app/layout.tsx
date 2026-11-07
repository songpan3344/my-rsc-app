import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RSC Lab — 家庭基础设施仪表盘 · Next.js 16 自托管',
  description: '服务端渲染 / React Server Components / 部分预渲染 / Suspense 流式渲染 / Server Actions 的可运行演示',
}

// 根布局默认是 Server Component，不会进入浏览器 bundle
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="zh-CN">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
