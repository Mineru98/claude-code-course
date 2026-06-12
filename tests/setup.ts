import { beforeEach, afterAll } from 'vitest'
import { prisma } from '@/lib/db'

beforeEach(async () => {
  await prisma.auditLog.deleteMany()
  await prisma.session.deleteMany()
  await prisma.employeeRole.deleteMany()
  await prisma.rolePermission.deleteMany()
  await prisma.permission.deleteMany()
  await prisma.role.deleteMany()
  // 자기참조(manager/parent) 때문에 먼저 FK 해제
  await prisma.employee.updateMany({ data: { managerId: null, departmentId: null } })
  await prisma.department.updateMany({ data: { parentId: null, managerId: null } })
  await prisma.department.deleteMany()
  await prisma.employee.deleteMany()
})

afterAll(async () => {
  await prisma.$disconnect()
})
