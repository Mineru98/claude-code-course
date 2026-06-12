import type { Department } from '@prisma/client'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/modules/rbac/permissions'
import { logAudit } from '@/modules/audit/audit'
import { ValidationError, NotFoundError } from '@/lib/errors'
import type { CreateDepartmentInput } from './schema'

export interface DepartmentNode extends Department {
  children: DepartmentNode[]
}

export async function createDepartment(actorId: string, input: CreateDepartmentInput): Promise<Department> {
  await requirePermission(actorId, 'org.manage')
  return prisma.$transaction(async (tx) => {
    const dept = await tx.department.create({
      data: { name: input.name, parentId: input.parentId ?? null, managerId: input.managerId ?? null },
    })
    await logAudit(tx, {
      actorId, action: 'org.create', targetType: 'Department', targetId: dept.id,
      metadata: { name: dept.name },
    })
    return dept
  })
}

export async function getDepartmentTree(actorId: string): Promise<DepartmentNode[]> {
  await requirePermission(actorId, 'org.read')
  const all = await prisma.department.findMany({ orderBy: { name: 'asc' } })
  const byId = new Map<string, DepartmentNode>()
  for (const d of all) byId.set(d.id, { ...d, children: [] })
  const roots: DepartmentNode[] = []
  for (const node of byId.values()) {
    if (node.parentId && byId.has(node.parentId)) {
      byId.get(node.parentId)!.children.push(node)
    } else {
      roots.push(node)
    }
  }
  return roots
}

async function descendantIds(targetId: string): Promise<Set<string>> {
  const all = await prisma.department.findMany({ select: { id: true, parentId: true } })
  const childrenOf = new Map<string, string[]>()
  for (const d of all) {
    if (d.parentId) {
      const arr = childrenOf.get(d.parentId) ?? []
      arr.push(d.id)
      childrenOf.set(d.parentId, arr)
    }
  }
  const result = new Set<string>()
  const stack = [targetId]
  while (stack.length) {
    const cur = stack.pop()!
    for (const child of childrenOf.get(cur) ?? []) {
      if (!result.has(child)) {
        result.add(child)
        stack.push(child)
      }
    }
  }
  return result
}

export async function moveDepartment(actorId: string, departmentId: string, parentId: string | null): Promise<Department> {
  await requirePermission(actorId, 'org.manage')
  const dept = await prisma.department.findUnique({ where: { id: departmentId } })
  if (!dept) throw new NotFoundError('부서를 찾을 수 없습니다.')

  if (parentId === departmentId) throw new ValidationError('자기 자신을 상위 부서로 지정할 수 없습니다.')
  if (parentId) {
    const descendants = await descendantIds(departmentId)
    if (descendants.has(parentId)) {
      throw new ValidationError('하위 부서를 상위 부서로 지정할 수 없습니다.')
    }
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.department.update({ where: { id: departmentId }, data: { parentId } })
    await logAudit(tx, {
      actorId, action: 'org.move', targetType: 'Department', targetId: departmentId,
      metadata: { parentId },
    })
    return updated
  })
}

export async function assignEmployee(actorId: string, employeeId: string, departmentId: string | null): Promise<void> {
  await requirePermission(actorId, 'org.manage')
  await prisma.$transaction(async (tx) => {
    await tx.employee.update({ where: { id: employeeId }, data: { departmentId } })
    await logAudit(tx, {
      actorId, action: 'org.assign', targetType: 'Employee', targetId: employeeId,
      metadata: { departmentId },
    })
  })
}

export async function setDepartmentManager(actorId: string, departmentId: string, managerId: string | null): Promise<void> {
  await requirePermission(actorId, 'org.manage')
  await prisma.$transaction(async (tx) => {
    await tx.department.update({ where: { id: departmentId }, data: { managerId } })
    await logAudit(tx, {
      actorId, action: 'org.setManager', targetType: 'Department', targetId: departmentId,
      metadata: { managerId },
    })
  })
}
