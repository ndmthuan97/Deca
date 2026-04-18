import { db } from '@/db'
import { phrases } from '@/db/schema'
import { inArray } from 'drizzle-orm'
import { ok, badRequest, serverError } from '@/lib/api-response'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const { ids } = body as { ids: number[] }

    if (!Array.isArray(ids) || ids.length === 0) {
      return badRequest('ids array is required')
    }

    // Soft delete all specified ids
    const updated = await db
      .update(phrases)
      .set({ deleted_at: new Date() })
      .where(inArray(phrases.id, ids))
      .returning({ id: phrases.id })

    return ok({ count: updated.length }, `Deleted ${updated.length} phrases`)
  } catch (error) {
    console.error('[POST /api/phrases/bulk-delete]', error)
    return serverError('Failed to delete phrases', error)
  }
}

