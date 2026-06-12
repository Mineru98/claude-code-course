import { describe, it, expect } from 'vitest'
import { logAudit } from '@/modules/audit/audit'
import { prisma } from '@/lib/db'

describe('audit', () => {
  it('감사 로그를 기록한다', async () => {
    await logAudit(prisma, {
      actorId: 'actor1',
      action: 'employee.update',
      targetType: 'Employee',
      targetId: 'emp1',
      metadata: { field: 'name' },
    })
    const logs = await prisma.auditLog.findMany()
    expect(logs).toHaveLength(1)
    expect(logs[0].action).toBe('employee.update')
    expect(logs[0].targetId).toBe('emp1')
  })
})
