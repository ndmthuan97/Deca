import { db } from '@/db'
import { topics, phrases } from '@/db/schema'
import { eq, isNull, sql } from 'drizzle-orm'
import { generateTopicIcon, generateTopicDescription } from '@/lib/ai'
import { ok, created, badRequest, serverError } from '@/lib/api-response'

export async function GET() {
  try {
    // phrase_count only counts non-deleted phrases (WHERE deleted_at IS NULL)
    const result = await db
      .select({
        id: topics.id,
        name: topics.name,
        slug: topics.slug,
        description: topics.description,
        icon: topics.icon,
        order_index: topics.order_index,
        created_at: topics.created_at,
        phrase_count: sql<number>`count(case when ${phrases.deleted_at} is null then 1 end)::int`,
      })
      .from(topics)
      .leftJoin(phrases, eq(topics.id, phrases.topic_id))
      .groupBy(topics.id)
      .orderBy(topics.order_index)

    return ok(result)
  } catch (error) {
    console.error('[GET /api/topics]', error)
    return serverError('Failed to fetch topics', error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { name, slug, description, order_index } = body
    let { icon } = body

    if (!name || !slug) {
      return badRequest('name and slug are required')
    }

    if (!icon) {
      try {
        icon = await generateTopicIcon(name)
      } catch (err) {
        console.warn('Failed to generate icon, using default:', err)
        icon = '📚'
      }
    }

    let resolvedDescription = description
    if (!resolvedDescription) {
      try {
        resolvedDescription = await generateTopicDescription(name)
      } catch (err) {
        console.warn('Failed to generate description:', err)
      }
    }

    const [newTopic] = await db
      .insert(topics)
      .values({ name, slug, description: resolvedDescription, icon, order_index })
      .returning()

    return created(newTopic)
  } catch (error) {
    console.error('[POST /api/topics]', error)
    return serverError('Failed to create topic', error)
  }
}
