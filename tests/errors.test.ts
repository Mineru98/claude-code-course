import { describe, it, expect } from 'vitest'
import { AppError, ValidationError, ConflictError, ForbiddenError } from '@/lib/errors'

describe('errors', () => {
  it('ValidationError는 status 400과 code를 가진다', () => {
    const e = new ValidationError('잘못된 입력')
    expect(e).toBeInstanceOf(AppError)
    expect(e.statusCode).toBe(400)
    expect(e.code).toBe('VALIDATION')
    expect(e.message).toBe('잘못된 입력')
  })

  it('ConflictError는 409', () => {
    expect(new ConflictError('중복').statusCode).toBe(409)
  })

  it('ForbiddenError는 403', () => {
    expect(new ForbiddenError('권한 없음').statusCode).toBe(403)
  })
})
