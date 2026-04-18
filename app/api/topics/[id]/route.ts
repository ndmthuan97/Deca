import { db } from '@/db'
import { topics } from '@/db/schema'
import { eq } from 'drizzle-orm'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [topic] = await db.select().from(topics).where(eq(topics.id, parseInt(id)))

    if (!topic) return notFound('Topic not found')
    return ok(topic)
  } catch (error) {
    console.error('[GET /api/topics/[id]]', error)
    return serverError('Failed to fetch topic', error)
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const body = await request.json()

    const [updated] = await db
      .update(topics)
      .set(body)
      .where(eq(topics.id, parseInt(id)))
      .returning()

    if (!updated) return notFound('Topic not found')
    return ok(updated)
  } catch (error) {
    console.error('[PUT /api/topics/[id]]', error)
    return serverError('Failed to update topic', error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    await db.delete(topics).where(eq(topics.id, parseInt(id)))
    return ok({ id: parseInt(id) }, 'Topic deleted')
  } catch (error) {
    console.error('[DELETE /api/topics/[id]]', error)
    return serverError('Failed to delete topic', error)
  }
}

