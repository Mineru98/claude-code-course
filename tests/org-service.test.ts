import { describe, it, expect } from 'vitest'
import { createDepartment, getDepartmentTree, moveDepartment, assignEmployee, setDepartmentManager } from '@/modules/org/service'
import { seedRbac } from '@/../prisma/seed'
import { prisma } from '@/lib/db'
import { makeEmployee } from './helpers'
import { ValidationError } from '@/lib/errors'

async function makeAdmin() {
  await seedRbac()
  const admin = await makeEmployee({ email: 'admin@co.com' })
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } })
  await prisma.employeeRole.create({ data: { employeeId: admin.id, roleId: role.id } })
  return admin
}

describe('org service', () => {
  it('부서를 생성하고 트리로 조회한다', async () => {
    const admin = await makeAdmin()
    const root = await createDepartment(admin.id, { name: '본사' })
    await createDepartment(admin.id, { name: '개발팀', parentId: root.id })
    const tree = await getDepartmentTree(admin.id)
    expect(tree).toHaveLength(1)
    expect(tree[0].name).toBe('본사')
    expect(tree[0].children[0].name).toBe('개발팀')
  })

  it('부서를 다른 부모로 이동한다', async () => {
    const admin = await makeAdmin()
    const a = await createDepartment(admin.id, { name: 'A' })
    const b = await createDepartment(admin.id, { name: 'B' })
    await moveDepartment(admin.id, b.id, a.id)
    const moved = await prisma.department.findUnique({ where: { id: b.id } })
    expect(moved?.parentId).toBe(a.id)
  })

  it('자기 자신을 부모로 지정하면 ValidationError', async () => {
    const admin = await makeAdmin()
    const a = await createDepartment(admin.id, { name: 'A' })
    await expect(moveDepartment(admin.id, a.id, a.id)).rejects.toBeInstanceOf(ValidationError)
  })

  it('후손을 부모로 지정하면 ValidationError(순환 방지)', async () => {
    const admin = await makeAdmin()
    const a = await createDepartment(admin.id, { name: 'A' })
    const b = await createDepartment(admin.id, { name: 'B', parentId: a.id })
    await expect(moveDepartment(admin.id, a.id, b.id)).rejects.toBeInstanceOf(ValidationError)
  })

  it('직원을 부서에 배치한다', async () => {
    const admin = await makeAdmin()
    const dept = await createDepartment(admin.id, { name: '개발팀' })
    const emp = await makeEmployee({ email: 'e@co.com' })
    await assignEmployee(admin.id, emp.id, dept.id)
    const updated = await prisma.employee.findUnique({ where: { id: emp.id } })
    expect(updated?.departmentId).toBe(dept.id)
  })

  it('부서장을 지정한다', async () => {
    const admin = await makeAdmin()
    const dept = await createDepartment(admin.id, { name: '개발팀' })
    const mgr = await makeEmployee({ email: 'm@co.com' })
    await setDepartmentManager(admin.id, dept.id, mgr.id)
    const updated = await prisma.department.findUnique({ where: { id: dept.id } })
    expect(updated?.managerId).toBe(mgr.id)
  })
})
