import { randomBytes, createHash } from 'crypto'
import type { Employee } from '@prisma/client'
import { prisma } from '@/lib/db'

function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}

function ttlMs(): number {
  const hours = Number(process.env.SESSION_TTL_HOURS ?? '12')
  return hours * 60 * 60 * 1000
}

export async function createSession(employeeId: string): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + ttlMs())
  await prisma.session.create({
    data: { employeeId, tokenHash: hashToken(token), expiresAt },
  })
  return { token, expiresAt }
}

export async function validateSession(token: string): Promise<Employee | null> {
  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { employee: true },
  })
  if (!session) return null
  if (session.expiresAt < new Date()) {
    await prisma.session.delete({ where: { id: session.id } })
    return null
  }
  return session.employee
}

export async function destroySession(token: string): Promise<void> {
  await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
}

export async function destroyAllSessions(employeeId: string): Promise<void> {
  await prisma.session.deleteMany({ where: { employeeId } })
}
