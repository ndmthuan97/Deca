import { db } from '@/db'
import { phrases } from '@/db/schema'
import { ok, badRequest, serverError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { topic_id, data } = body

    if (!topic_id || !data || !Array.isArray(data) || data.length === 0) {
      return badRequest('topic_id and a non-empty data array are required')
    }

    const records = data.map((item: Record<string, string>) => ({
      topic_id: parseInt(topic_id),
      sample_sentence: item.sample_sentence?.trim(),
      type: item.type?.trim() || null,
      structure: item.structure?.trim() || null,
      function: item.function?.trim() || null,
      translation: item.translation?.trim() || null,
      pronunciation: item.pronunciation?.trim() || null,
      example1: item.example1?.trim() || null,
      example1_translation: item.example1_translation?.trim() || null,
      example1_pronunciation: item.example1_pronunciation?.trim() || null,
      example2: item.example2?.trim() || null,
      example2_translation: item.example2_translation?.trim() || null,
      example2_pronunciation: item.example2_pronunciation?.trim() || null,
    })).filter((r) => !!r.sample_sentence)

    if (records.length === 0) {
      return badRequest('No valid phrases found to insert')
    }

    const inserted = await db.insert(phrases).values(records).returning()
    return ok({ count: inserted.length }, `Inserted ${inserted.length} phrases`, 201)
  } catch (error) {
    console.error('[POST /api/phrases/bulk]', error)
    return serverError('Failed to insert phrases', error)
  }
}

