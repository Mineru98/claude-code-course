import { describe, it, expect } from 'vitest'
import { seedRbac } from '@/../prisma/seed'
import { prisma } from '@/lib/db'

describe('seedRbac', () => {
  it('기본 역할 3개와 권한을 생성한다', async () => {
    await seedRbac()
    const roles = await prisma.role.findMany()
    expect(roles.map(r => r.name).sort()).toEqual(['Admin', 'Employee', 'Manager'])

    const admin = await prisma.role.findUnique({
      where: { name: 'Admin' },
      include: { permissions: { include: { permission: true } } },
    })
    const keys = admin!.permissions.map(p => p.permission.key)
    expect(keys).toContain('*')
  })

  it('멱등하다 - 두 번 실행해도 역할이 중복되지 않는다', async () => {
    await seedRbac()
    await seedRbac()
    expect(await prisma.role.count()).toBe(3)
  })
})
