import type { Employee } from '@prisma/client'
import { validateSession } from './session'
import { AuthError } from '@/lib/errors'
import { SESSION_COOKIE } from './cookie'

export { SESSION_COOKIE }

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.get('cookie')
  if (!header) return undefined
  for (const part of header.split(';')) {
    const [k, ...v] = part.trim().split('=')
    if (k === name) return v.join('=')
  }
  return undefined
}

export async function getCurrentEmployee(req: Request): Promise<Employee | null> {
  const token = readCookie(req, SESSION_COOKIE)
  if (!token) return null
  return validateSession(token)
}

export async function requireCurrentEmployee(req: Request): Promise<Employee> {
  const emp = await getCurrentEmployee(req)
  if (!emp) throw new AuthError('로그인이 필요합니다.')
  return emp
}
