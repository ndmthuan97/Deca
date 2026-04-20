import { NextResponse } from 'next/server'
import { db } from '@/db'
import { topics, phrases } from '@/db/schema'
import { eq } from 'drizzle-orm'
import type { DaceTopicExport } from '@/app/api/topics/[id]/export/route'

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
}

/** Make slug unique by appending timestamp suffix if already taken */
async function uniqueSlug(base: string): Promise<string> {
  const existing = await db.select({ slug: topics.slug }).from(topics).where(eq(topics.slug, base)).limit(1)
  if (existing.length === 0) return base
  return `${base}-${Date.now()}`
}

export async function POST(req: Request) {
  try {
    const payload = await req.json() as DaceTopicExport

    // Validate structure
    if (!payload.__version || !payload.topic?.name || !Array.isArray(payload.phrases)) {
      return NextResponse.json(
        { statusCode: 400, message: 'Invalid Dace export file format', data: null, errors: null },
        { status: 400 },
      )
    }

    const baseSlug = slugify(payload.topic.slug ?? payload.topic.name)
    const slug     = await uniqueSlug(baseSlug)

    // Create topic
    const [newTopic] = await db
      .insert(topics)
      .values({
        name:        payload.topic.name,
        slug,
        description: payload.topic.description,
        icon:        payload.topic.icon ?? '📚',
      })
      .returning()

    // Bulk-insert phrases (skip empty sample_sentence)
    const valid = payload.phrases.filter(p => p.sample_sentence?.trim())
    if (valid.length > 0) {
      await db.insert(phrases).values(
        valid.map(p => ({
          topic_id:              newTopic.id,
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
        })),
      )
    }

    return NextResponse.json({
      statusCode: 201,
      message: `Đã import chủ đề "${newTopic.name}" với ${valid.length} câu`,
      data: { topic: newTopic, phraseCount: valid.length },
      errors: null,
    }, { status: 201 })
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    console.error('[POST /api/topics/import]', msg)
    return NextResponse.json({ statusCode: 500, message: msg, data: null, errors: null }, { status: 500 })
  }
}
