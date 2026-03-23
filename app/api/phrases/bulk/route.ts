import { NextResponse } from 'next/server'
import { db } from '@/db'
import { phrases } from '@/db/schema'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { topic_id, data } = body

    if (!topic_id || !data || !Array.isArray(data) || data.length === 0) {
      return NextResponse.json({ error: 'topic_id and a non-empty data array are required' }, { status: 400 })
    }

    // Prepare data
    const records = data.map((item: any) => ({
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
    })).filter((r: any) => !!r.sample_sentence) // Must have sample sentence

    if (records.length === 0) {
      return NextResponse.json({ error: 'No valid phrases found to insert' }, { status: 400 })
    }

    // Insert chunk to prevent payload too large (though usually fine for < 1000 items)
    const inserted = await db.insert(phrases).values(records).returning()

    return NextResponse.json({ success: true, count: inserted.length }, { status: 201 })
  } catch (error) {
    console.error('[POST /api/phrases/bulk]', error)
    return NextResponse.json({ error: 'Failed to insert phrases' }, { status: 500 })
  }
}
