import { describe, it, expect } from 'vitest'
import { handle } from '@/lib/route-handler'
import { ConflictError } from '@/lib/errors'

describe('route handler wrapper', () => {
  it('정상 반환은 200 JSON', async () => {
    const res = await handle(async () => ({ ok: true }))
    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ ok: true })
  })

  it('AppError는 해당 status와 code로 변환', async () => {
    const res = await handle(async () => { throw new ConflictError('중복') })
    expect(res.status).toBe(409)
    expect(await res.json()).toEqual({ error: { code: 'CONFLICT', message: '중복' } })
  })

  it('알 수 없는 에러는 500', async () => {
    const res = await handle(async () => { throw new Error('boom') })
    expect(res.status).toBe(500)
    expect((await res.json()).error.code).toBe('INTERNAL')
  })
})
