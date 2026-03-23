import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function POST(request: Request) {
  const { pin } = await request.json()

  if (!pin) {
    return NextResponse.json({ error: 'PIN is required' }, { status: 400 })
  }

  const correctPin = process.env.PIN_CODE

  if (pin !== correctPin) {
    return NextResponse.json({ error: 'Sai PIN, thử lại!' }, { status: 401 })
  }

  const response = NextResponse.json({ success: true })
  // Set cookie for 7 days
  response.cookies.set('pin_verified', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 7,
    path: '/',
  })

  return response
}

export async function DELETE() {
  const response = NextResponse.json({ success: true })
  response.cookies.delete('pin_verified')
  return response
}
