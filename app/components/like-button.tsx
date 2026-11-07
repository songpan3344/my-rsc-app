'use client'

import { useOptimistic, useState, useTransition } from 'react'

// 一个最小的 Client Component「交互岛」：React 19 的乐观更新
export function LikeButton() {
  const [likes, setLikes] = useState(0)
  const [optimisticLikes, addOptimisticLike] = useOptimistic(
    likes,
    (current: number) => current + 1,
  )
  const [, startTransition] = useTransition()

  function handleClick() {
    startTransition(() => {
      addOptimisticLike(1)
      setLikes((n) => n + 1)
    })
  }

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-rose-600">
        Client Island · useOptimistic
      </p>
      <h2 className="mt-2 text-lg font-semibold text-neutral-900">客户端交互</h2>
      <p className="mt-4 text-sm leading-relaxed text-neutral-600">
        只有这一个组件（及留言簿表单）的 JS 会进入浏览器包；页面其余部分全在服务端渲染。
      </p>

      <button
        type="button"
        onClick={handleClick}
        className="mt-5 rounded-lg border border-rose-200 bg-rose-50 px-4 py-2 text-sm font-medium text-rose-700 transition hover:bg-rose-100"
      >
        点赞 {optimisticLikes}
      </button>

      <p className="mt-4 text-xs text-neutral-500">
        乐观更新立即反馈，真实状态由 React transition 收敛。
      </p>
    </section>
  )
}
