import { generatePhraseFields, isVocabularyInput } from '@/lib/ai'
import { ok, badRequest, tooManyRequests, serverError } from '@/lib/api-response'
import { checkRateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  // ── Rate limiting: 20 req/phút/IP ──────────────────────────
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? 'unknown'
  const { allowed } = checkRateLimit(`generate:${ip}`, { limit: 20 })
  if (!allowed) {
    return tooManyRequests('Quá nhiều yêu cầu AI. Vui lòng thử lại sau 1 phút.')
  }

  try {
    const body = await request.json()
    const { sampleSentence, topicName } = body

    if (!sampleSentence || typeof sampleSentence !== 'string') {
      return badRequest('sampleSentence is required')
    }

    const mode = isVocabularyInput(sampleSentence) ? 'vocabulary' : 'sentence'
    console.info(`[POST /api/generate] mode=${mode} input="${sampleSentence}"`)

    const result = await generatePhraseFields(
      sampleSentence,
      topicName || 'English Conversation'
    )

    return ok(result)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error('[POST /api/generate]', message)
    return serverError('AI generation failed', error)
  }
}

