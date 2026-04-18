import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { ok, badRequest, serverError } from '@/lib/api-response'
import type { ApiResponse } from '@/lib/api-response'

export async function POST(request: Request) {
  const { pin } = await request.json()

  if (!pin) {
    return badRequest('PIN is required')
  }

  const correctPin = process.env.PIN_CODE

  if (pin !== correctPin) {
    const body: ApiResponse = { statusCode: 401, message: 'Sai PIN, thử lại!', data: null, errors: null }
    return NextResponse.json(body, { status: 401 })
  }

  // Build response with cookie
  const body: ApiResponse = { statusCode: 200, message: 'success', data: { verified: true }, errors: null }
  const response = NextResponse.json(body)
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
  const body: ApiResponse = { statusCode: 200, message: 'success', data: null, errors: null }
  const response = NextResponse.json(body)
  response.cookies.delete('pin_verified')
  return response
}

