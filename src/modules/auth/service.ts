import { prisma } from '@/lib/db'
import { verifyPassword } from './password'
import { createSession, destroySession } from './session'
import { toPublicEmployee, type PublicEmployee } from '@/lib/serialize'
import { AuthError } from '@/lib/errors'

export async function login(email: string, password: string): Promise<{ token: string; expiresAt: Date; employee: PublicEmployee }> {
  const emp = await prisma.employee.findUnique({ where: { email } })
  if (!emp) throw new AuthError('이메일 또는 비밀번호가 올바르지 않습니다.')
  if (emp.status === 'OFFBOARDED') throw new AuthError('비활성화된 계정입니다.')
  if (!(await verifyPassword(password, emp.passwordHash))) {
    throw new AuthError('이메일 또는 비밀번호가 올바르지 않습니다.')
  }
  const { token, expiresAt } = await createSession(emp.id)
  return { token, expiresAt, employee: toPublicEmployee(emp) }
}

export async function logout(token: string): Promise<void> {
  await destroySession(token)
}
