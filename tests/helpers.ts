import { prisma } from '@/lib/db'

export async function makeEmployee(overrides: Partial<{
  email: string; name: string; departmentId: string | null; managerId: string | null
}> = {}) {
  return prisma.employee.create({
    data: {
      email: overrides.email ?? `u${Math.floor(performance.now() * 1000)}@co.com`,
      passwordHash: 'x',
      name: overrides.name ?? '홍길동',
      departmentId: overrides.departmentId ?? null,
      managerId: overrides.managerId ?? null,
    },
  })
}
