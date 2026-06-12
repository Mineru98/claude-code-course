import { prisma } from '@/lib/db'
import { ForbiddenError } from '@/lib/errors'

export async function getPermissionKeys(employeeId: string): Promise<Set<string>> {
  const rows = await prisma.employeeRole.findMany({
    where: { employeeId },
    include: { role: { include: { permissions: { include: { permission: true } } } } },
  })
  const keys = new Set<string>()
  for (const er of rows) {
    for (const rp of er.role.permissions) keys.add(rp.permission.key)
  }
  return keys
}

export async function hasPermission(employeeId: string, key: string): Promise<boolean> {
  const keys = await getPermissionKeys(employeeId)
  return keys.has('*') || keys.has(key)
}

export async function requirePermission(employeeId: string, key: string): Promise<void> {
  if (!(await hasPermission(employeeId, key))) {
    throw new ForbiddenError(`권한이 없습니다: ${key}`)
  }
}

export async function isAdmin(employeeId: string): Promise<boolean> {
  const keys = await getPermissionKeys(employeeId)
  return keys.has('*')
}
