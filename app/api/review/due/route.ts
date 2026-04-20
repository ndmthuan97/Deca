import { db } from '@/db'
import { phrases } from '@/db/schema'
import { and, isNull, lte, sql } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api-response'

/**
 * GET /api/review/due?limit=20&topic_id=3
 * Trả về các phrases cần ôn hôm nay (next_review_at <= NOW()).
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const rawLimit = parseInt(searchParams.get('limit') ?? '20', 10)
  // 999 means "all" — use a large but safe cap (500)
  const limit    = rawLimit >= 999 ? 500 : Math.min(rawLimit, 200)
  const topicId  = searchParams.get('topic_id')

  try {
    const conditions = [
      isNull(phrases.deleted_at),
      lte(phrases.next_review_at, sql`NOW()`),
    ]
    if (topicId) {
      conditions.push(sql`${phrases.topic_id} = ${parseInt(topicId, 10)}`)
    }

    const due = await db
      .select({
        id:              phrases.id,
        topic_id:        phrases.topic_id,
        sample_sentence: phrases.sample_sentence,
        translation:     phrases.translation,
        pronunciation:   phrases.pronunciation,
        type:            phrases.type,
        structure:       phrases.structure,
        function:        phrases.function,
        example1:        phrases.example1,
        example1_translation:   phrases.example1_translation,
        example1_pronunciation: phrases.example1_pronunciation,
        example2:        phrases.example2,
        example2_translation:   phrases.example2_translation,
        example2_pronunciation: phrases.example2_pronunciation,
        ease_factor:     phrases.ease_factor,
        review_interval: phrases.review_interval,
        repetitions:     phrases.repetitions,
        next_review_at:  phrases.next_review_at,
      })
      .from(phrases)
      .where(and(...conditions))
      .limit(limit)

    return ok({ phrases: due, count: due.length })
  } catch (err) {
    console.error('[GET /api/review/due]', err)
    return serverError('Failed to fetch due phrases')
  }
}
