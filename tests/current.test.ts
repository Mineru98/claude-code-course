import { describe, it, expect } from 'vitest'
import { getCurrentEmployee, requireCurrentEmployee, SESSION_COOKIE } from '@/modules/auth/current'
import { createSession } from '@/modules/auth/session'
import { makeEmployee } from './helpers'
import { AuthError } from '@/lib/errors'

function reqWithCookie(token?: string): Request {
  const headers = new Headers()
  if (token) headers.set('cookie', `${SESSION_COOKIE}=${token}`)
  return new Request('http://localhost/api/test', { headers })
}

describe('current employee', () => {
  it('유효 쿠키로 현재 직원을 반환', async () => {
    const emp = await makeEmployee()
    const { token } = await createSession(emp.id)
    const found = await getCurrentEmployee(reqWithCookie(token))
    expect(found?.id).toBe(emp.id)
  })

  it('쿠키 없으면 null', async () => {
    expect(await getCurrentEmployee(reqWithCookie())).toBeNull()
  })

  it('requireCurrentEmployee는 비로그인 시 AuthError', async () => {
    await expect(requireCurrentEmployee(reqWithCookie())).rejects.toBeInstanceOf(AuthError)
  })
})
