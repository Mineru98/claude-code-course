import { describe, it, expect } from 'vitest'
import { login } from '@/modules/auth/service'
import { hashPassword } from '@/modules/auth/password'
import { validateSession } from '@/modules/auth/session'
import { prisma } from '@/lib/db'
import { AuthError } from '@/lib/errors'

async function makeUserWithPassword(email: string, password: string) {
  return prisma.employee.create({
    data: { email, name: '유저', passwordHash: await hashPassword(password) },
  })
}

describe('auth service login', () => {
  it('올바른 자격증명으로 로그인하면 세션 토큰을 반환한다', async () => {
    await makeUserWithPassword('a@co.com', 'pw12345')
    const { token, employee } = await login('a@co.com', 'pw12345')
    expect(employee.email).toBe('a@co.com')
    expect((employee as any).passwordHash).toBeUndefined()
    const found = await validateSession(token)
    expect(found?.email).toBe('a@co.com')
  })

  it('틀린 비밀번호는 AuthError', async () => {
    await makeUserWithPassword('b@co.com', 'pw12345')
    await expect(login('b@co.com', 'wrong')).rejects.toBeInstanceOf(AuthError)
  })

  it('없는 이메일은 AuthError', async () => {
    await expect(login('none@co.com', 'x')).rejects.toBeInstanceOf(AuthError)
  })

  it('OFFBOARDED 직원은 로그인 불가', async () => {
    const u = await makeUserWithPassword('c@co.com', 'pw12345')
    await prisma.employee.update({ where: { id: u.id }, data: { status: 'OFFBOARDED' } })
    await expect(login('c@co.com', 'pw12345')).rejects.toBeInstanceOf(AuthError)
  })
})
