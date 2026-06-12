import { describe, it, expect } from 'vitest'
import { hashPassword, verifyPassword } from '@/modules/auth/password'

describe('password', () => {
  it('해시는 평문과 다르고 검증에 성공한다', async () => {
    const hash = await hashPassword('secret123')
    expect(hash).not.toBe('secret123')
    expect(await verifyPassword('secret123', hash)).toBe(true)
  })

  it('틀린 비밀번호는 검증 실패', async () => {
    const hash = await hashPassword('secret123')
    expect(await verifyPassword('wrong', hash)).toBe(false)
  })
})
