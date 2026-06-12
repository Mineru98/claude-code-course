import { describe, it, expect } from 'vitest'
import { createEmployeeSchema, updateEmployeeSchema } from '@/modules/employees/schema'

describe('employee schema', () => {
  it('유효한 생성 입력을 통과시킨다', () => {
    const r = createEmployeeSchema.safeParse({
      email: 'a@co.com', name: '김철수', jobTitle: '개발자',
    })
    expect(r.success).toBe(true)
  })

  it('이메일 형식이 틀리면 실패', () => {
    const r = createEmployeeSchema.safeParse({ email: 'bad', name: '김철수' })
    expect(r.success).toBe(false)
  })

  it('수정 입력은 부분 필드를 허용한다', () => {
    const r = updateEmployeeSchema.safeParse({ phone: '010-0000-0000' })
    expect(r.success).toBe(true)
  })
})
