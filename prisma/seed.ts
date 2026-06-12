import bcrypt from 'bcryptjs'
import { prisma } from '../src/lib/db'

const PERMISSIONS = ['*', 'employee.read', 'employee.write', 'org.read', 'org.manage', 'rbac.manage', 'self.read', 'self.update']

const ROLE_PERMISSIONS: Record<string, string[]> = {
  Admin: ['*'],
  Manager: ['employee.read', 'employee.write', 'org.read'],
  Employee: ['self.read', 'self.update', 'org.read'],
}

export async function seedRbac() {
  for (const key of PERMISSIONS) {
    await prisma.permission.upsert({ where: { key }, create: { key }, update: {} })
  }
  for (const [roleName, keys] of Object.entries(ROLE_PERMISSIONS)) {
    const role = await prisma.role.upsert({
      where: { name: roleName },
      create: { name: roleName },
      update: {},
    })
    for (const key of keys) {
      const perm = await prisma.permission.findUniqueOrThrow({ where: { key } })
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        create: { roleId: role.id, permissionId: perm.id },
        update: {},
      })
    }
  }

  // 최초 Admin 계정 (멱등)
  const adminEmail = 'admin@company.com'
  const adminRole = await prisma.role.findUniqueOrThrow({ where: { name: 'Admin' } })
  const existing = await prisma.employee.findUnique({ where: { email: adminEmail } })
  if (!existing) {
    const admin = await prisma.employee.create({
      data: {
        email: adminEmail,
        name: '최초 관리자',
        passwordHash: await bcrypt.hash('admin1234', 10),
        mustChangePassword: true,
      },
    })
    await prisma.employeeRole.create({ data: { employeeId: admin.id, roleId: adminRole.id } })
  }
}

// Run directly via `tsx prisma/seed.ts`
// Use import.meta.url check which is safe under both tsx (CJS/ESM) and vitest
// typeof require !== 'undefined' && require.main === module handles CJS (tsx default)
// This avoids ReferenceError when `require` is not defined in ESM vitest context
if (typeof require !== 'undefined' && require.main === module) {
  seedRbac()
    .then(() => console.log('RBAC seeded'))
    .catch((e) => { console.error(e); process.exit(1) })
    .finally(() => prisma.$disconnect())
}
