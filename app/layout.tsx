import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'RSC Lab — Next.js 16 自托管',
  description: '服务端渲染 / React Server Components / Cache Components / Server Actions 演示',
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
