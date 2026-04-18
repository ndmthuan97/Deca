import { generateTopicIcon } from '@/lib/ai'
import { ok } from '@/lib/api-response'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const name = searchParams.get('name')?.trim()

  if (!name || name.length < 2) {
    return ok({ icon: '📚' })
  }

  try {
    const icon = await generateTopicIcon(name)
    return ok({ icon })
  } catch (error) {
    console.warn('[GET /api/topics/suggest-icon] AI error:', error)
    return ok({ icon: '📚' })
  }
}

