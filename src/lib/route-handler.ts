import { NextResponse } from 'next/server'
import { AppError } from './errors'

export async function handle(fn: () => Promise<unknown>): Promise<NextResponse> {
  try {
    const data = await fn()
    if (data instanceof NextResponse) return data
    return NextResponse.json(data, { status: 200 })
  } catch (err) {
    if (err instanceof AppError) {
      return NextResponse.json(
        { error: { code: err.code, message: err.message } },
        { status: err.statusCode },
      )
    }
    console.error(err)
    return NextResponse.json(
      { error: { code: 'INTERNAL', message: '서버 오류가 발생했습니다.' } },
      { status: 500 },
    )
  }
}
