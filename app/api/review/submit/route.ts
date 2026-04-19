import { db } from '@/db'
import { phrases, studyLogs } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ok, badRequest, notFound, serverError } from '@/lib/api-response'
import { calculateNextReview, type ReviewResult } from '@/lib/srs'

const VALID_RESULTS: ReviewResult[] = ['again', 'hard', 'good', 'easy']

/**
 * POST /api/review/submit
 * Body: { phraseId: number, result: 'again' | 'hard' | 'good' | 'easy' }
 *
 * 1. Tính trạng thái SRS mới (SM-2)
 * 2. Update phrase với next_review_at, ease_factor, review_interval, repetitions
 * 3. Insert vào study_logs
 */
export async function POST(request: Request) {
  let body: unknown
  try {
    body = await request.json()
  } catch {
    return badRequest('Invalid JSON body')
  }

  const { phraseId, result } = body as { phraseId?: number; result?: string }

  if (!phraseId || typeof phraseId !== 'number') {
    return badRequest('phraseId is required and must be a number')
  }
  if (!result || !VALID_RESULTS.includes(result as ReviewResult)) {
    return badRequest(`result must be one of: ${VALID_RESULTS.join(', ')}`)
  }

  try {
    // Lấy trạng thái SRS hiện tại
    const [phrase] = await db
      .select({
        id:              phrases.id,
        ease_factor:     phrases.ease_factor,
        review_interval: phrases.review_interval,
        repetitions:     phrases.repetitions,
      })
      .from(phrases)
      .where(eq(phrases.id, phraseId))
      .limit(1)

    if (!phrase) return notFound('Phrase not found')

    // Tính trạng thái SRS mới
    const next = calculateNextReview(
      {
        easeFactor:     phrase.ease_factor     ?? 2.5,
        reviewInterval: phrase.review_interval ?? 0,
        repetitions:    phrase.repetitions     ?? 0,
      },
      result as ReviewResult
    )

    // Update phrase + insert study log (song song)
    await Promise.all([
      db.update(phrases)
        .set({
          next_review_at:  next.nextReviewAt,
          ease_factor:     next.easeFactor,
          review_interval: next.reviewInterval,
          repetitions:     next.repetitions,
        })
        .where(eq(phrases.id, phraseId)),

      db.insert(studyLogs).values({
        phrase_id:   phraseId,
        result:      result,
        reviewed_at: new Date(),
      }),
    ])

    return ok({
      phraseId,
      result,
      next: {
        nextReviewAt:   next.nextReviewAt,
        easeFactor:     next.easeFactor,
        reviewInterval: next.reviewInterval,
        repetitions:    next.repetitions,
      },
    })
  } catch (err) {
    console.error('[POST /api/review/submit]', err)
    return serverError('Failed to submit review')
  }
}
