import type { Employee } from '@prisma/client'

export type PublicEmployee = Omit<Employee, 'passwordHash'>

export function toPublicEmployee(emp: Employee): PublicEmployee {
  const { passwordHash: _omit, ...rest } = emp
  return rest
}
