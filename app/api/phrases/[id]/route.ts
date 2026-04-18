import { db } from '@/db'
import { phrases } from '@/db/schema'
import { eq, isNull, and } from 'drizzle-orm'
import { ok, notFound, serverError } from '@/lib/api-response'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const [phrase] = await db
      .select()
      .from(phrases)
      .where(and(eq(phrases.id, parseInt(id)), isNull(phrases.deleted_at)))

    if (!phrase) return notFound('Phrase not found')
    return ok(phrase)
  } catch (error) {
    console.error('[GET /api/phrases/[id]]', error)
    return serverError('Failed to fetch phrase', error)
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
      .update(phrases)
      .set(body)
      .where(eq(phrases.id, parseInt(id)))
      .returning()

    if (!updated) return notFound('Phrase not found')
    return ok(updated)
  } catch (error) {
    console.error('[PUT /api/phrases/[id]]', error)
    return serverError('Failed to update phrase', error)
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    // Soft delete: set deleted_at instead of hard delete
    const [updated] = await db
      .update(phrases)
      .set({ deleted_at: new Date() })
      .where(eq(phrases.id, parseInt(id)))
      .returning()
    if (!updated) return notFound('Phrase not found')
    return ok({ id: parseInt(id) }, 'Phrase deleted')
  } catch (error) {
    console.error('[DELETE /api/phrases/[id]]', error)
    return serverError('Failed to delete phrase', error)
  }
}

