import { NextResponse } from 'next/server'
import { db } from '@/db'
import { phrases } from '@/db/schema'
import { eq, sql, isNotNull, and } from 'drizzle-orm'

export interface MatchCard {
  id: number
  english: string
  vietnamese: string
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const topicId = searchParams.get('topicId')
  const count   = Math.min(parseInt(searchParams.get('count') ?? '8'), 12)

  try {
    const conditions = [isNotNull(phrases.translation)]
    if (topicId) conditions.push(eq(phrases.topic_id, parseInt(topicId)))

    const rows = await db
      .select({ id: phrases.id, sample_sentence: phrases.sample_sentence, translation: phrases.translation })
      .from(phrases)
      .where(and(...conditions))
      .orderBy(sql`RANDOM()`)
      .limit(count)

    if (rows.length < 4) {
      return NextResponse.json({ statusCode: 400, message: 'Không đủ câu để chơi (cần ít nhất 4)', data: null, errors: null }, { status: 400 })
    }

    const cards: MatchCard[] = rows.map(r => ({
      id: r.id,
      english: r.sample_sentence,
      vietnamese: r.translation!,
    }))

    return NextResponse.json({ statusCode: 200, message: 'ok', data: cards, errors: null })
  } catch (e) {
    console.error('[match] error', e)
    return NextResponse.json({ statusCode: 500, message: 'Internal error', data: null, errors: null }, { status: 500 })
  }
}
