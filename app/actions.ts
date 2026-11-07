'use server'

import { revalidatePath } from 'next/cache'

export type SignState = {
  status: 'idle' | 'ok' | 'error'
  message: string
  total: number
}

// 演示用的进程内计数；生产环境应落库。
// 安全提示：每个 'use server' 函数都是公开 POST 端点，
// 生产代码必须在此处做认证 + 授权 + 输入校验，proxy.ts 不是安全边界。
let total = 0

export async function signGuestbook(
  _prev: SignState,
  formData: FormData,
): Promise<SignState> {
  const name = String(formData.get('name') ?? '').trim()

  if (name.length < 2 || name.length > 40) {
    return { status: 'error', message: '昵称需 2–40 个字符', total }
  }

  total += 1
  revalidatePath('/')

  return {
    status: 'ok',
    message: `已记录「${name}」— 由 Server Action 在服务端写入，无需 API 路由`,
    total,
  }
}
