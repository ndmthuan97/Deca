import { db } from '@/db'
import { phrases, topics } from '@/db/schema'
import { and, isNull, ilike, or, eq } from 'drizzle-orm'
import { ok, badRequest, serverError } from '@/lib/api-response'

/**
 * GET /api/search?q=hello&limit=20
 * Full-text search trên sample_sentence + translation, kèm topic name.
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const q     = searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  if (!q || q.length < 1) {
    return ok({ results: [], count: 0 })
  }
  if (q.length > 200) {
    return badRequest('Query too long')
  }

  try {
    const pattern = `%${q}%`

    const results = await db
      .select({
        id:              phrases.id,
        topic_id:        phrases.topic_id,
        sample_sentence: phrases.sample_sentence,
        translation:     phrases.translation,
        pronunciation:   phrases.pronunciation,
        type:            phrases.type,
        topic_name:      topics.name,
        topic_icon:      topics.icon,
        topic_slug:      topics.slug,
      })
      .from(phrases)
      .innerJoin(topics, eq(phrases.topic_id, topics.id))
      .where(
        and(
          isNull(phrases.deleted_at),
          or(
            ilike(phrases.sample_sentence, pattern),
            ilike(phrases.translation,     pattern),
          )
        )
      )
      .limit(limit)

    return ok({ results, count: results.length })
  } catch (err) {
    console.error('[GET /api/search]', err)
    return serverError('Search failed')
  }
}
