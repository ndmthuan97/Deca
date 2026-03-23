import { NextResponse } from 'next/server'
import { db } from '@/db'
import { topics } from '@/db/schema'
import { eq } from 'drizzle-orm'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [topic] = await db.select().from(topics).where(eq(topics.id, parseInt(id)))

    if (!topic) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(topic)
  } catch (error) {
    console.error('[GET /api/topics/[id]]', error)
    return NextResponse.json({ error: 'Failed to fetch topic' }, { status: 500 })
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
      .update(topics)
      .set(body)
      .where(eq(topics.id, parseInt(id)))
      .returning()

    if (!updated) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(updated)
  } catch (error) {
    console.error('[PUT /api/topics/[id]]', error)
    return NextResponse.json({ error: 'Failed to update topic' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.delete(topics).where(eq(topics.id, parseInt(id)))
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('[DELETE /api/topics/[id]]', error)
    return NextResponse.json({ error: 'Failed to delete topic' }, { status: 500 })
  }
}
