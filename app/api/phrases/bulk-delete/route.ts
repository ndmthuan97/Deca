import { NextResponse } from 'next/server'
import { db } from '@/db'
import { phrases } from '@/db/schema'
import { inArray } from 'drizzle-orm'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body as { ids: number[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return NextResponse.json({ error: 'ids array is required' }, { status: 400 })
    }

    // Soft delete all specified ids
    const updated = await db
      .update(phrases)
      .set({ deleted_at: new Date() })
      .where(inArray(phrases.id, ids))
      .returning({ id: phrases.id })

    return NextResponse.json({ success: true, count: updated.length })
  } catch (error) {
    console.error('[POST /api/phrases/bulk-delete]', error)
    return NextResponse.json({ error: 'Failed to delete phrases' }, { status: 500 })
  }
}
