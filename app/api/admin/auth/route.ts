import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  const { password } = await request.json() as { password: string }
  const adminPass = process.env.ADMIN_PASSWORD || process.env.PIN_CODE

  if (!adminPass || password !== adminPass) {
    return NextResponse.json(
      { statusCode: 401, message: 'Sai mật khẩu', data: null, errors: null },
      { status: 401 }
    )
  }

  return NextResponse.json({ statusCode: 200, message: 'OK', data: { ok: true }, errors: null })
}
