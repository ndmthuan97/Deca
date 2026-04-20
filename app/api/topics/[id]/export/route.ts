import { NextResponse } from 'next/server'
import { db } from '@/db'
import { topics, phrases } from '@/db/schema'
import { eq, isNull } from 'drizzle-orm'

export const DACE_EXPORT_VERSION = 1

export interface DaceTopicExport {
  __version: number
  __exported_at: string
  topic: {
    name: string
    slug: string
    description: string | null
    icon: string | null
  }
  phrases: Array<{
    sample_sentence: string
    translation: string | null
    type: string | null
    structure: string | null
    function: string | null
    pronunciation: string | null
    example1: string | null
    example1_translation: string | null
    example1_pronunciation: string | null
    example2: string | null
    example2_translation: string | null
    example2_pronunciation: string | null
  }>
}

export async function GET(
  _req: Request,
  { params }: { params: { id: string } },
) {
  const id = parseInt(params.id, 10)
  if (isNaN(id)) {
    return NextResponse.json({ statusCode: 400, message: 'Invalid id', data: null, errors: null }, { status: 400 })
  }

  const [topic] = await db.select().from(topics).where(eq(topics.id, id)).limit(1)
  if (!topic) {
    return NextResponse.json({ statusCode: 404, message: 'Topic not found', data: null, errors: null }, { status: 404 })
  }

  const phraseRows = await db
    .select()
    .from(phrases)
    .where(eq(phrases.topic_id, id))

  // Filter out soft-deleted, strip SRS + internal fields
  const exportPhrases = phraseRows
    .filter(p => !p.deleted_at)
    .map(p => ({
      sample_sentence:       p.sample_sentence,
      translation:           p.translation,
      type:                  p.type,
      structure:             p.structure,
      function:              p.function,
      pronunciation:         p.pronunciation,
      example1:              p.example1,
      example1_translation:  p.example1_translation,
      example1_pronunciation: p.example1_pronunciation,
      example2:              p.example2,
      example2_translation:  p.example2_translation,
      example2_pronunciation: p.example2_pronunciation,
    }))

  const payload: DaceTopicExport = {
    __version:     DACE_EXPORT_VERSION,
    __exported_at: new Date().toISOString(),
    topic: {
      name:        topic.name,
      slug:        topic.slug,
      description: topic.description,
      icon:        topic.icon,
    },
    phrases: exportPhrases,
  }

  const filename = `dace-${topic.slug}-${new Date().toISOString().slice(0, 10)}.json`

  return new NextResponse(JSON.stringify(payload, null, 2), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Content-Disposition': `attachment; filename="${filename}"`,
    },
  })
}
