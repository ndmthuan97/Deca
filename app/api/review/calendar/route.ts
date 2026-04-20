import { db } from '@/db'
import { phrases } from '@/db/schema'
import { isNull, gte, lte, and } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api-response'

/**
 * GET /api/review/calendar
 * Returns count of phrases due per day for the next 30 days.
 * Used by the Review Calendar widget on Dashboard.
 */
export async function GET() {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    const in30Days = new Date(today)
    in30Days.setDate(in30Days.getDate() + 30)

    // Get all non-deleted phrases with their next_review_at
    const allPhrases = await db
      .select({
        id:             phrases.id,
        next_review_at: phrases.next_review_at,
        repetitions:    phrases.repetitions,
        ease_factor:    phrases.ease_factor,
        review_interval: phrases.review_interval,
      })
      .from(phrases)
      .where(
        and(
          isNull(phrases.deleted_at),
          gte(phrases.next_review_at, today),
          lte(phrases.next_review_at, in30Days),
        )
      )

    // Build a map: dateString → count
    const countMap: Record<string, number> = {}
    for (const p of allPhrases) {
      if (!p.next_review_at) continue
      const d = new Date(p.next_review_at)
      const key = d.toISOString().slice(0, 10) // "2025-04-20"
      countMap[key] = (countMap[key] ?? 0) + 1
    }

    // Build 30-day array
    const calendar: { date: string; count: number }[] = []
    for (let i = 0; i < 30; i++) {
      const d = new Date(today)
      d.setDate(d.getDate() + i)
      const key = d.toISOString().slice(0, 10)
      calendar.push({ date: key, count: countMap[key] ?? 0 })
    }

    return ok({ calendar })
  } catch (error) {
    console.error('[GET /api/review/calendar]', error)
    return serverError('Failed to fetch calendar', error)
  }
}
