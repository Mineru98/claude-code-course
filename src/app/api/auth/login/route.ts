import { handle } from '@/lib/route-handler'
import { loginSchema } from '@/modules/auth/schema'
import { login } from '@/modules/auth/service'
import { SESSION_COOKIE } from '@/modules/auth/current'
import { ValidationError } from '@/lib/errors'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  return handle(async () => {
    const body = await req.json().catch(() => null)
    const parsed = loginSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('이메일과 비밀번호를 입력하세요.')

    const { token, expiresAt, employee } = await login(parsed.data.email, parsed.data.password)
    const res = NextResponse.json({ employee }, { status: 200 })
    res.cookies.set(SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      expires: expiresAt,
      path: '/',
    })
    return res
  })
}
