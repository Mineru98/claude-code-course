import { handle } from '@/lib/route-handler'
import { logout } from '@/modules/auth/service'
import { SESSION_COOKIE } from '@/modules/auth/current'
import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  return handle(async () => {
    const cookie = req.headers.get('cookie') ?? ''
    const token = cookie.split(';').map(s => s.trim()).find(s => s.startsWith(`${SESSION_COOKIE}=`))?.split('=')[1]
    if (token) await logout(token)
    const res = NextResponse.json({ ok: true })
    res.cookies.delete(SESSION_COOKIE)
    return res
  })
}
