import { db } from '@/db'
import { phrases } from '@/db/schema'
import { eq, asc, isNull, and } from 'drizzle-orm'
import { ok, created, badRequest, serverError } from '@/lib/api-response'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const topicId = searchParams.get('topic_id')

    const result = topicId
      ? await db
          .select()
          .from(phrases)
          .where(and(eq(phrases.topic_id, parseInt(topicId)), isNull(phrases.deleted_at)))
          .orderBy(asc(phrases.created_at))
      : await db
          .select()
          .from(phrases)
          .where(isNull(phrases.deleted_at))
          .orderBy(asc(phrases.created_at))

    return ok(result)
  } catch (error) {
    console.error('[GET /api/phrases]', error)
    return serverError('Failed to fetch phrases', error)
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()

    if (!body.sample_sentence || !body.topic_id) {
      return badRequest('sample_sentence and topic_id are required')
    }

    const [newPhrase] = await db.insert(phrases).values(body).returning()
    return created(newPhrase)
  } catch (error) {
    console.error('[POST /api/phrases]', error)
    return serverError('Failed to create phrase', error)
  }
}

