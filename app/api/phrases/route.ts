import { NextResponse } from 'next/server'
import { db } from '@/db'
import { phrases } from '@/db/schema'
import { eq, asc, isNull, and } from 'drizzle-orm'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topic_id')

    const result = topicId
      ? await db
          .select()
          .from(phrases)
          .where(and(eq(phrases.topic_id, parseInt(topicId)), isNull(phrases.deleted_at)))
          .orderBy(asc(phrases.created_at))
      : await db
          .select()
          .from(phrases)
          .where(isNull(phrases.deleted_at))
          .orderBy(asc(phrases.created_at))

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/phrases]', error)
    return NextResponse.json({ error: 'Failed to fetch phrases' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.sample_sentence || !body.topic_id) {
      return NextResponse.json(
        { error: 'sample_sentence and topic_id are required' },
        { status: 400 }
      )
    }

    const [created] = await db.insert(phrases).values(body).returning()
    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('[POST /api/phrases]', error)
    return NextResponse.json({ error: 'Failed to create phrase' }, { status: 500 })
  }
}
