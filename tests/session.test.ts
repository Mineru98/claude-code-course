import { describe, it, expect } from 'vitest'
import { createSession, validateSession, destroySession } from '@/modules/auth/session'
import { makeEmployee } from './helpers'

describe('session', () => {
  it('생성한 세션 토큰으로 직원을 검증한다', async () => {
    const emp = await makeEmployee()
    const { token } = await createSession(emp.id)
    const found = await validateSession(token)
    expect(found?.id).toBe(emp.id)
  })

  it('잘못된 토큰은 null', async () => {
    expect(await validateSession('nope')).toBeNull()
  })

  it('삭제된 세션은 검증 실패', async () => {
    const emp = await makeEmployee()
    const { token } = await createSession(emp.id)
    await destroySession(token)
    expect(await validateSession(token)).toBeNull()
  })
})
