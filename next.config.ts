import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 产出自包含的 server.js + 最小 node_modules，供 Docker standalone 部署
  output: 'standalone',

  // 不泄露框架指纹（x-powered-by）
  poweredByHeader: false,

  // React Compiler 1.0：构建期自动 memo，免去手写 useMemo/useCallback/React.memo
  reactCompiler: true,

  // Next 16 的 Cache Components：取代 experimental.ppr
  // 静态外壳在构建时预渲染，动态区块由 <Suspense> 边界流式填充
  cacheComponents: true,

  // 新项目应同时开启 Partial Prefetching（Next 16.4 推荐配置）
  partialPrefetching: true,

  images: {
    formats: ['image/avif', 'image/webp'],
  },
}

export default nextConfig
