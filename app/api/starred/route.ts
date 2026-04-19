import { NextResponse } from 'next/server'
import { db } from '@/db'
import { phrases } from '@/db/schema'
import { inArray } from 'drizzle-orm'

export async function POST(req: Request) {
  try {
    const { ids } = await req.json() as { ids: number[] }
    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ statusCode: 400, message: 'ids required', data: null, errors: null }, { status: 400 })
    }

    const rows = await db
      .select()
      .from(phrases)
      .where(inArray(phrases.id, ids.slice(0, 100))) // cap at 100

    return NextResponse.json({ statusCode: 200, message: 'ok', data: rows, errors: null })
  } catch (e) {
    console.error('[starred/phrases]', e)
    return NextResponse.json({ statusCode: 500, message: 'Internal error', data: null, errors: null }, { status: 500 })
  }
}
