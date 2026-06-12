import { describe, it, expect } from 'vitest'
import { createEmployee, listEmployees, updateEmployee, transitionStatus, getEmployee } from '@/modules/employees/service'
import { seedRbac } from '@/../prisma/seed'
import { prisma } from '@/lib/db'
import { makeEmployee } from './helpers'
import { ForbiddenError } from '@/lib/errors'

async function makeAdmin() {
  await seedRbac()
  const admin = await makeEmployee({ email: 'admin@co.com' })
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } })
  await prisma.employeeRole.create({ data: { employeeId: admin.id, roleId: role.id } })
  return admin
}

async function makeManagerOfDept(deptName: string) {
  const dept = await prisma.department.create({ data: { name: deptName } })
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Manager' } })
  const mgr = await makeEmployee({ email: `mgr${Date.now()}_${deptName}@co.com`, departmentId: dept.id })
  await prisma.employeeRole.create({ data: { employeeId: mgr.id, roleId: role.id } })
  await prisma.department.update({ where: { id: dept.id }, data: { managerId: mgr.id } })
  return { mgr, dept }
}

async function makeManager(deptId: string) {
  const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Manager' } })
  const mgr = await makeEmployee({ email: `mgr${Date.now()}@co.com`, departmentId: deptId })
  await prisma.employeeRole.create({ data: { employeeId: mgr.id, roleId: role.id } })
  return mgr
}

describe('employee service', () => {
  it('Admin이 직원을 생성하면 임시 비밀번호 반환 + 감사 로그 기록', async () => {
    const admin = await makeAdmin()
    const { employee, tempPassword } = await createEmployee(admin.id, {
      email: 'new@co.com', name: '신입',
    })
    expect(employee.email).toBe('new@co.com')
    expect(tempPassword).toHaveLength(12)
    const logs = await prisma.auditLog.findMany({ where: { action: 'employee.create' } })
    expect(logs).toHaveLength(1)
  })

  it('중복 이메일은 ConflictError', async () => {
    const admin = await makeAdmin()
    await createEmployee(admin.id, { email: 'dup@co.com', name: 'A' })
    await expect(createEmployee(admin.id, { email: 'dup@co.com', name: 'B' }))
      .rejects.toThrowError(/이미/)
  })

  it('권한 없는 직원이 생성하면 ForbiddenError', async () => {
    await seedRbac()
    const emp = await makeEmployee()
    const role = await prisma.role.findUniqueOrThrow({ where: { name: 'Employee' } })
    await prisma.employeeRole.create({ data: { employeeId: emp.id, roleId: role.id } })
    await expect(createEmployee(emp.id, { email: 'x@co.com', name: 'X' }))
      .rejects.toBeInstanceOf(ForbiddenError)
  })

  it('Admin은 전체 직원을 조회한다', async () => {
    const admin = await makeAdmin()
    await makeEmployee({ email: 'e1@co.com' })
    await makeEmployee({ email: 'e2@co.com' })
    const list = await listEmployees(admin.id)
    expect(list.length).toBeGreaterThanOrEqual(3)
  })

  it('Manager는 본인 부서 직원만 조회한다', async () => {
    await makeAdmin()
    const dept = await prisma.department.create({ data: { name: '개발팀' } })
    const otherDept = await prisma.department.create({ data: { name: '영업팀' } })
    const mgr = await makeManager(dept.id)
    await prisma.department.update({ where: { id: dept.id }, data: { managerId: mgr.id } })
    await makeEmployee({ email: 'in@co.com', departmentId: dept.id })
    await makeEmployee({ email: 'out@co.com', departmentId: otherDept.id })

    const list = await listEmployees(mgr.id)
    const emails = list.map(e => e.email)
    expect(emails).toContain('in@co.com')
    expect(emails).not.toContain('out@co.com')
  })

  it('상태 전환 OFFBOARDED 시 세션이 무효화된다', async () => {
    const admin = await makeAdmin()
    const target = await makeEmployee({ email: 't@co.com' })
    await prisma.session.create({
      data: { employeeId: target.id, tokenHash: 'h', expiresAt: new Date(Date.now() + 100000) },
    })
    await transitionStatus(admin.id, target.id, 'OFFBOARDED')
    const updated = await prisma.employee.findUnique({ where: { id: target.id } })
    expect(updated?.status).toBe('OFFBOARDED')
    expect(await prisma.session.count({ where: { employeeId: target.id } })).toBe(0)
  })

  it('수정은 감사 로그를 남긴다', async () => {
    const admin = await makeAdmin()
    const target = await makeEmployee({ email: 'u@co.com' })
    await updateEmployee(admin.id, target.id, { jobTitle: '팀장' })
    const updated = await prisma.employee.findUnique({ where: { id: target.id } })
    expect(updated?.jobTitle).toBe('팀장')
    expect(await prisma.auditLog.count({ where: { action: 'employee.update' } })).toBe(1)
  })

  it('Manager는 본인 부서 직원을 getEmployee로 조회한다', async () => {
    await makeAdmin()
    const { mgr, dept } = await makeManagerOfDept('개발팀')
    const member = await makeEmployee({ email: 'member@co.com', departmentId: dept.id })
    const got = await getEmployee(mgr.id, member.id)
    expect(got.id).toBe(member.id)
  })

  it('Manager가 범위 밖 직원을 getEmployee하면 ForbiddenError', async () => {
    await makeAdmin()
    const { mgr } = await makeManagerOfDept('개발팀')
    const other = await prisma.department.create({ data: { name: '영업팀' } })
    const outsider = await makeEmployee({ email: 'outsider@co.com', departmentId: other.id })
    await expect(getEmployee(mgr.id, outsider.id)).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('Manager가 범위 밖 직원을 수정하면 ForbiddenError', async () => {
    await makeAdmin()
    const { mgr } = await makeManagerOfDept('개발팀')
    const other = await prisma.department.create({ data: { name: '영업팀' } })
    const outsider = await makeEmployee({ email: 'out2@co.com', departmentId: other.id })
    await expect(updateEmployee(mgr.id, outsider.id, { jobTitle: 'x' })).rejects.toBeInstanceOf(ForbiddenError)
  })

  it('Manager는 본인 부서 직원을 수정할 수 있다', async () => {
    await makeAdmin()
    const { mgr, dept } = await makeManagerOfDept('개발팀')
    const member = await makeEmployee({ email: 'member2@co.com', departmentId: dept.id })
    const updated = await updateEmployee(mgr.id, member.id, { jobTitle: '리드' })
    expect(updated.jobTitle).toBe('리드')
  })

  it('Admin은 범위 제한 없이 임의 직원을 getEmployee한다', async () => {
    const admin = await makeAdmin()
    const dept = await prisma.department.create({ data: { name: '아무팀' } })
    const anyEmp = await makeEmployee({ email: 'any@co.com', departmentId: dept.id })
    const got = await getEmployee(admin.id, anyEmp.id)
    expect(got.id).toBe(anyEmp.id)
  })
})
