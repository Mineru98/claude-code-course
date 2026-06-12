import { randomBytes } from 'crypto'
import type { Employee, EmployeeStatus } from '@prisma/client'
import { prisma } from '@/lib/db'
import { hashPassword } from '@/modules/auth/password'
import { requirePermission, isAdmin } from '@/modules/rbac/permissions'
import { logAudit } from '@/modules/audit/audit'
import { ConflictError, ForbiddenError, NotFoundError } from '@/lib/errors'
import type { CreateEmployeeInput, UpdateEmployeeInput } from './schema'

function genTempPassword(): string {
  return randomBytes(6).toString('hex') // 12자
}

async function managedDepartmentIds(actorId: string): Promise<string[]> {
  const depts = await prisma.department.findMany({
    where: { managerId: actorId },
    select: { id: true },
  })
  return depts.map(d => d.id)
}

async function assertInScope(actorId: string, target: { departmentId: string | null }): Promise<void> {
  if (await isAdmin(actorId)) return
  const deptIds = await managedDepartmentIds(actorId)
  if (!target.departmentId || !deptIds.includes(target.departmentId)) {
    throw new ForbiddenError('범위 밖의 직원입니다.')
  }
}

export async function getEmployee(actorId: string, id: string): Promise<Employee> {
  await requirePermission(actorId, 'employee.read')
  const emp = await prisma.employee.findUnique({ where: { id } })
  if (!emp) throw new NotFoundError('직원을 찾을 수 없습니다.')
  await assertInScope(actorId, emp)
  return emp
}

export async function createEmployee(actorId: string, input: CreateEmployeeInput) {
  await requirePermission(actorId, 'employee.write')

  const existing = await prisma.employee.findUnique({ where: { email: input.email } })
  if (existing) throw new ConflictError('이미 존재하는 이메일입니다.')

  const tempPassword = genTempPassword()
  const passwordHash = await hashPassword(tempPassword)

  const employee = await prisma.$transaction(async (tx) => {
    const emp = await tx.employee.create({
      data: {
        email: input.email,
        name: input.name,
        phone: input.phone,
        jobTitle: input.jobTitle,
        departmentId: input.departmentId,
        managerId: input.managerId,
        passwordHash,
        mustChangePassword: true,
      },
    })
    if (input.roleNames?.length) {
      const roles = await tx.role.findMany({ where: { name: { in: input.roleNames } } })
      for (const role of roles) {
        await tx.employeeRole.create({ data: { employeeId: emp.id, roleId: role.id } })
      }
    }
    await logAudit(tx, {
      actorId, action: 'employee.create', targetType: 'Employee', targetId: emp.id,
      metadata: { email: emp.email },
    })
    return emp
  })

  return { employee, tempPassword }
}

export async function listEmployees(actorId: string): Promise<Employee[]> {
  await requirePermission(actorId, 'employee.read')
  if (await isAdmin(actorId)) {
    return prisma.employee.findMany({ orderBy: { createdAt: 'asc' } })
  }
  const deptIds = await managedDepartmentIds(actorId)
  return prisma.employee.findMany({
    where: { departmentId: { in: deptIds } },
    orderBy: { createdAt: 'asc' },
  })
}

export async function updateEmployee(actorId: string, targetId: string, input: UpdateEmployeeInput): Promise<Employee> {
  await requirePermission(actorId, 'employee.write')
  const target = await prisma.employee.findUnique({ where: { id: targetId } })
  if (!target) throw new NotFoundError('직원을 찾을 수 없습니다.')
  await assertInScope(actorId, target)

  return prisma.$transaction(async (tx) => {
    const updated = await tx.employee.update({ where: { id: targetId }, data: input })
    await logAudit(tx, {
      actorId, action: 'employee.update', targetType: 'Employee', targetId,
      metadata: { fields: Object.keys(input) },
    })
    return updated
  })
}

export async function transitionStatus(actorId: string, targetId: string, status: EmployeeStatus): Promise<Employee> {
  await requirePermission(actorId, 'employee.write')
  const target = await prisma.employee.findUnique({ where: { id: targetId } })
  if (!target) throw new NotFoundError('직원을 찾을 수 없습니다.')
  await assertInScope(actorId, target)

  return prisma.$transaction(async (tx) => {
    const emp = await tx.employee.update({ where: { id: targetId }, data: { status } })
    await logAudit(tx, {
      actorId, action: 'employee.status', targetType: 'Employee', targetId,
      metadata: { status },
    })
    if (status === 'OFFBOARDED') {
      await tx.session.deleteMany({ where: { employeeId: targetId } })
    }
    return emp
  })
}
