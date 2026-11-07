'use client'

import { useActionState } from 'react'
import { useFormStatus } from 'react-dom'
import { signGuestbook, type SignState } from '../actions'

const initialState: SignState = { status: 'idle', message: '', total: 0 }

function SubmitButton() {
  // useFormStatus 读取父 <form> 的提交状态，无需透传 pending
  const { pending } = useFormStatus()

  return (
    <button
      type="submit"
      disabled={pending}
      className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
    >
      {pending ? '提交中…' : '提交签名'}
    </button>
  )
}

export function GuestbookForm() {
  // React 19：useActionState 承接 Server Action 的返回值，表单在无 JS 时也能渐进增强工作
  const [state, formAction] = useActionState(signGuestbook, initialState)

  return (
    <section className="rounded-2xl border border-neutral-200 bg-white p-6 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-widest text-indigo-600">
        Server Action
      </p>
      <h2 className="mt-2 text-lg font-semibold text-neutral-900">留言簿</h2>

      <form action={formAction} className="mt-5 space-y-3">
        <input
          name="name"
          type="text"
          placeholder="输入昵称"
          maxLength={40}
          className="w-full rounded-lg border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100"
        />
        <SubmitButton />
      </form>

      <p
        aria-live="polite"
        className={`mt-4 min-h-5 text-sm ${state.status === 'error' ? 'text-red-600' : 'text-emerald-700'}`}
      >
        {state.message || '提交后由服务端函数直接处理，不经过客户端 fetch。'}
      </p>
      {state.total > 0 && (
        <p className="mt-1 text-xs text-neutral-500">本进程累计写入 {state.total} 条</p>
      )}
    </section>
  )
}
