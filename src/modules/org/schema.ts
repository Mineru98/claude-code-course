import { z } from 'zod'

export const createDepartmentSchema = z.object({
  name: z.string().min(1),
  parentId: z.string().nullable().optional(),
  managerId: z.string().nullable().optional(),
})

export const moveDepartmentSchema = z.object({
  parentId: z.string().nullable(),
})

export const assignEmployeeSchema = z.object({
  employeeId: z.string(),
  departmentId: z.string().nullable(),
})

export type CreateDepartmentInput = z.infer<typeof createDepartmentSchema>
