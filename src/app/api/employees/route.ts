import { handle } from '@/lib/route-handler'
import { requireCurrentEmployee } from '@/modules/auth/current'
import { listEmployees, createEmployee } from '@/modules/employees/service'
import { createEmployeeSchema } from '@/modules/employees/schema'
import { toPublicEmployee } from '@/lib/serialize'
import { ValidationError } from '@/lib/errors'

export async function GET(req: Request) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    const list = await listEmployees(actor.id)
    return { employees: list.map(toPublicEmployee) }
  })
}

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    const body = await req.json().catch(() => null)
    const parsed = createEmployeeSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('직원 정보가 올바르지 않습니다.')
    const { employee, tempPassword } = await createEmployee(actor.id, parsed.data)
    return { employee: toPublicEmployee(employee), tempPassword }
  })
}
