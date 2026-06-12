import { describe, it, expect } from 'vitest'
import { getPermissionKeys, requirePermission, hasPermission } from '@/modules/rbac/permissions'
import { seedRbac } from '@/../prisma/seed'
import { prisma } from '@/lib/db'
import { makeEmployee } from './helpers'
import { ForbiddenError } from '@/lib/errors'

async function assignRole(employeeId: string, roleName: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: roleName } })
  await prisma.employeeRole.create({ data: { employeeId, roleId: role.id } })
}

describe('permissions', () => {
  it('Admin은 와일드카드 권한을 가진다', async () => {
    await seedRbac()
    const emp = await makeEmployee()
    await assignRole(emp.id, 'Admin')
    const keys = await getPermissionKeys(emp.id)
    expect(keys.has('*')).toBe(true)
    expect(await hasPermission(emp.id, 'employee.write')).toBe(true)
  })

  it('Employee는 employee.write 권한이 없다', async () => {
    await seedRbac()
    const emp = await makeEmployee()
    await assignRole(emp.id, 'Employee')
    expect(await hasPermission(emp.id, 'employee.write')).toBe(false)
  })

  it('requirePermission은 권한 없으면 ForbiddenError', async () => {
    await seedRbac()
    const emp = await makeEmployee()
    await assignRole(emp.id, 'Employee')
    await expect(requirePermission(emp.id, 'employee.write')).rejects.toBeInstanceOf(ForbiddenError)
  })
})
