import type { Prisma, PrismaClient } from '@prisma/client'

type Db = PrismaClient | Prisma.TransactionClient

export interface AuditInput {
  actorId: string
  action: string
  targetType: string
  targetId: string
  metadata?: Prisma.InputJsonValue
}

export async function logAudit(db: Db, input: AuditInput): Promise<void> {
  await db.auditLog.create({
    data: {
      actorId: input.actorId,
      action: input.action,
      targetType: input.targetType,
      targetId: input.targetId,
      metadata: input.metadata,
    },
  })
}
