import { describe, it, expect } from 'vitest'
import { createDepartmentSchema, moveDepartmentSchema } from '@/modules/org/schema'

describe('org schema', () => {
  it('부서 생성은 이름이 필수', () => {
    expect(createDepartmentSchema.safeParse({ name: '개발팀' }).success).toBe(true)
    expect(createDepartmentSchema.safeParse({ name: '' }).success).toBe(false)
  })

  it('이동은 parentId를 받는다(null 허용)', () => {
    expect(moveDepartmentSchema.safeParse({ parentId: null }).success).toBe(true)
    expect(moveDepartmentSchema.safeParse({ parentId: 'abc' }).success).toBe(true)
  })
})
