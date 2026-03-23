import { NextResponse } from 'next/server'
import { db } from '@/db'
import { phrases } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [phrase] = await db.select().from(phrases).where(eq(phrases.id, parseInt(id)))

    if (!phrase) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(phrase)
  } catch (error) {
    console.error('[GET /api/phrases/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch phrase' }, { status: 500 })
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const [updated] = await db
      .update(phrases)
      .set(body)
      .where(eq(phrases.id, parseInt(id)))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/phrases/[id]]', error)
    return NextResponse.json({ error: 'Failed to update phrase' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.delete(phrases).where(eq(phrases.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/phrases/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete phrase' }, { status: 500 })
  }
}
