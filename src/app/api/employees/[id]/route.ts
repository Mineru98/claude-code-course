import { handle } from '@/lib/route-handler'
import { requireCurrentEmployee } from '@/modules/auth/current'
import { updateEmployee } from '@/modules/employees/service'
import { updateEmployeeSchema } from '@/modules/employees/schema'
import { toPublicEmployee } from '@/lib/serialize'
import { prisma } from '@/lib/db'
import { requirePermission } from '@/modules/rbac/permissions'
import { ValidationError, NotFoundError } from '@/lib/errors'

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    await requirePermission(actor.id, 'employee.read')
    const { id } = await params
    const emp = await prisma.employee.findUnique({ where: { id } })
    if (!emp) throw new NotFoundError('직원을 찾을 수 없습니다.')
    return { employee: toPublicEmployee(emp) }
  })
}

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    const { id } = await params
    const body = await req.json().catch(() => null)
    const parsed = updateEmployeeSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('수정 정보가 올바르지 않습니다.')
    const updated = await updateEmployee(actor.id, id, parsed.data)
    return { employee: toPublicEmployee(updated) }
  })
}
