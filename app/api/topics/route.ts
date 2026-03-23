import { NextResponse } from 'next/server'
import { db } from '@/db'
import { topics, phrases } from '@/db/schema'
import { eq, sql } from 'drizzle-orm'
import { generateTopicIcon, generateTopicDescription } from '@/lib/ai'

export async function GET() {
  try {
    // Get topics with phrase count via subquery
    const result = await db
      .select({
        id: topics.id,
        name: topics.name,
        slug: topics.slug,
        description: topics.description,
        icon: topics.icon,
        order_index: topics.order_index,
        created_at: topics.created_at,
        phrase_count: sql<number>`count(${phrases.id})::int`,
      })
      .from(topics)
      .leftJoin(phrases, eq(topics.id, phrases.topic_id))
      .groupBy(topics.id)
      .orderBy(topics.order_index)

    return NextResponse.json(result)
  } catch (error) {
    console.error('[GET /api/topics]', error)
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, slug, description, order_index } = body
    let { icon } = body

    if (!name || !slug) {
      return NextResponse.json({ error: 'name and slug are required' }, { status: 400 })
    }

    if (!icon) {
      try {
        icon = await generateTopicIcon(name)
      } catch (err) {
        console.warn('Failed to generate icon, using default:', err)
        icon = '📚'
      }
    }

    // Auto-generate a short description if not provided
    let resolvedDescription = description
    if (!resolvedDescription) {
      try {
        resolvedDescription = await generateTopicDescription(name)
      } catch (err) {
        console.warn('Failed to generate description:', err)
      }
    }

    const [created] = await db
      .insert(topics)
      .values({ name, slug, description: resolvedDescription, icon, order_index })
      .returning()

    return NextResponse.json(created, { status: 201 })
  } catch (error) {
    console.error('[POST /api/topics]', error)
    return NextResponse.json({ error: 'Failed to create topic' }, { status: 500 })
  }
}
