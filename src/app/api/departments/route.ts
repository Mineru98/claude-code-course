import { handle } from '@/lib/route-handler'
import { requireCurrentEmployee } from '@/modules/auth/current'
import { getDepartmentTree, createDepartment } from '@/modules/org/service'
import { createDepartmentSchema } from '@/modules/org/schema'
import { ValidationError } from '@/lib/errors'

export async function GET(req: Request) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    return { tree: await getDepartmentTree(actor.id) }
  })
}

export async function POST(req: Request) {
  return handle(async () => {
    const actor = await requireCurrentEmployee(req)
    const body = await req.json().catch(() => null)
    const parsed = createDepartmentSchema.safeParse(body)
    if (!parsed.success) throw new ValidationError('부서 정보가 올바르지 않습니다.')
    return { department: await createDepartment(actor.id, parsed.data) }
  })
}
