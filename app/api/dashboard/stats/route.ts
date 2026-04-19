import { db } from '@/db'
import { phrases, studyLogs, topics } from '@/db/schema'
import { and, isNull, eq, sql, count, gte } from 'drizzle-orm'
import { ok, serverError } from '@/lib/api-response'

/**
 * GET /api/dashboard/stats
 * Trả về toàn bộ thống kê học tập để render Dashboard.
 */
export async function GET() {
  try {
    const now      = new Date()
    const day30ago = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const day7ago  = new Date(now.getTime() -  7 * 24 * 60 * 60 * 1000)
    // Đầu ngày hôm nay (UTC midnight)
    const todayStart = new Date(now)
    todayStart.setUTCHours(0, 0, 0, 0)

    // ── 1. Tổng phrases / topics ─────────────────────────────────
    const [totalPhrasesRow] = await db
      .select({ total: count() })
      .from(phrases)
      .where(isNull(phrases.deleted_at))

    const [totalTopicsRow] = await db
      .select({ total: count() })
      .from(topics)

    // ── 2. Phrases đã thuộc (repetitions >= 3 = "learned") ───────
    const [learnedRow] = await db
      .select({ total: count() })
      .from(phrases)
      .where(and(isNull(phrases.deleted_at), sql`${phrases.repetitions} >= 3`))

    // ── 3. Activity heatmap: số lượt ôn mỗi ngày (30 ngày qua) ──
    const activityRaw = await db
      .select({
        date:  sql<string>`DATE(${studyLogs.reviewed_at} AT TIME ZONE 'UTC')`.as('date'),
        count: count(),
      })
      .from(studyLogs)
      .where(gte(studyLogs.reviewed_at, day30ago))
      .groupBy(sql`DATE(${studyLogs.reviewed_at} AT TIME ZONE 'UTC')`)
      .orderBy(sql`DATE(${studyLogs.reviewed_at} AT TIME ZONE 'UTC')`)

    // ── 4. Kết quả 7 ngày qua (again/hard/good/easy counts) ─────
    const resultRaw = await db
      .select({
        result: studyLogs.result,
        count:  count(),
      })
      .from(studyLogs)
      .where(gte(studyLogs.reviewed_at, day7ago))
      .groupBy(studyLogs.result)

    const resultMap: Record<string, number> = { again: 0, hard: 0, good: 0, easy: 0 }
    for (const r of resultRaw) {
      if (r.result) resultMap[r.result] = Number(r.count)
    }

    // ── 5. Phrases cần ôn hôm nay ────────────────────────────────
    const [dueTodayRow] = await db
      .select({ total: count() })
      .from(phrases)
      .where(
        and(
          isNull(phrases.deleted_at),
          sql`${phrases.next_review_at} <= NOW()`
        )
      )

    // ── 6. Top 5 câu hay quên nhất (result = 'again' nhiều nhất) ─
    const hardestPhrases = await db
      .select({
        phraseId:       studyLogs.phrase_id,
        againCount:     count(),
        sampleSentence: phrases.sample_sentence,
        translation:    phrases.translation,
      })
      .from(studyLogs)
      .innerJoin(phrases, eq(studyLogs.phrase_id, phrases.id))
      .where(and(eq(studyLogs.result, 'again'), isNull(phrases.deleted_at)))
      .groupBy(studyLogs.phrase_id, phrases.sample_sentence, phrases.translation)
      .orderBy(sql`count(*) DESC`)
      .limit(5)

    // ── 7. Phân bố loại câu theo type ────────────────────────────
    const typeDistRaw = await db
      .select({
        type:  phrases.type,
        count: count(),
      })
      .from(phrases)
      .where(isNull(phrases.deleted_at))
      .groupBy(phrases.type)
      .orderBy(sql`count(*) DESC`)

    const typeDist = typeDistRaw
      .filter(r => r.type)
      .map(r => ({
        type:  r.type!,
        count: Number(r.count),
      }))

    // ── 8. Tổng số lượt ôn 7 ngày qua ───────────────────────────
    const [reviewedWeekRow] = await db
      .select({ total: count() })
      .from(studyLogs)
      .where(gte(studyLogs.reviewed_at, day7ago))

    // ── 9. Lượt ôn hôm nay (cho Daily Target widget) ────────────
    const [reviewedTodayRow] = await db
      .select({ total: count() })
      .from(studyLogs)
      .where(gte(studyLogs.reviewed_at, todayStart))

    // ── 10. Điểm yếu theo topic (tỷ lệ quên) ────────────────────
    const weakTopicsRaw = await db
      .select({
        topicId:      phrases.topic_id,
        topicName:    topics.name,
        totalReviews: count(),
        againCount:   sql<number>`SUM(CASE WHEN ${studyLogs.result} = 'again' THEN 1 ELSE 0 END)`,
      })
      .from(studyLogs)
      .innerJoin(phrases, eq(studyLogs.phrase_id, phrases.id))
      .innerJoin(topics, eq(phrases.topic_id, topics.id))
      .where(and(isNull(phrases.deleted_at), gte(studyLogs.reviewed_at, day30ago)))
      .groupBy(phrases.topic_id, topics.name)
      .having(sql`count(*) >= 3`) // chỉ hiển thị topic đã ôn ít nhất 3 lần
      .orderBy(sql`SUM(CASE WHEN ${studyLogs.result} = 'again' THEN 1 ELSE 0 END) * 1.0 / count(*) DESC`)
      .limit(8)

    const weakTopics = weakTopicsRaw.map(r => ({
      topicId:      r.topicId,
      topicName:    r.topicName,
      totalReviews: Number(r.totalReviews),
      againRate:    Number(r.againCount) / Number(r.totalReviews),
    }))

    return ok({
      summary: {
        totalPhrases:   Number(totalPhrasesRow.total),
        totalTopics:    Number(totalTopicsRow.total),
        learnedPhrases: Number(learnedRow.total),
        dueToday:       Number(dueTodayRow.total),
        reviewedWeek:   Number(reviewedWeekRow.total),
        reviewedToday:  Number(reviewedTodayRow.total),
      },
      activity:      activityRaw.map(r => ({ date: r.date, count: Number(r.count) })),
      resultBreakdown: resultMap,
      hardestPhrases: hardestPhrases.map(h => ({
        phraseId:       h.phraseId,
        againCount:     Number(h.againCount),
        sampleSentence: h.sampleSentence,
        translation:    h.translation,
      })),
      typeDist,
      weakTopics,
    })
  } catch (err) {
    console.error('[GET /api/dashboard/stats]', err)
    return serverError('Failed to fetch dashboard stats')
  }
}
