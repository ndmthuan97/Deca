import { ok, badRequest, serverError } from '@/lib/api-response'

/**
 * POST /api/import/daily-dictation
 * Body: { url: string }
 *
 * Scrapes a Daily Dictation exercise page (https://dailydictation.com/exercises/NNN)
 * and extracts the sentence being dictated.
 *
 * Returns: { sentence, source_url, hint }
 */
export async function POST(request: Request) {
  let body: unknown
  try { body = await request.json() } catch { return badRequest('Invalid JSON') }

  const { url } = body as { url?: string }
  if (!url || typeof url !== 'string') return badRequest('url is required')

  const normalized = url.trim()
  if (!normalized.includes('dailydictation.com')) {
    return badRequest('Only dailydictation.com URLs are supported')
  }

  try {
    const res = await fetch(normalized, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; Dace-Importer/1.0)',
        'Accept': 'text/html',
      },
      signal: AbortSignal.timeout(8000),
    })

    if (!res.ok) return serverError(`Cannot fetch page: ${res.status}`)

    const html = await res.text()

    // Strategy 1: data attribute in audio tag or transcript block
    const transcriptMatch = html.match(/class="[^"]*transcript[^"]*"[^>]*>\s*([^<]{10,300})/i)
      ?? html.match(/id="transcript"[^>]*>\s*([^<]{10,300})/i)

    // Strategy 2: <p class="sentence"> or similar
    const sentenceMatch = html.match(/class="[^"]*sentence[^"]*"[^>]*>\s*([^<]{10,300})/i)
      ?? html.match(/class="[^"]*dictation-text[^"]*"[^>]*>\s*([^<]{10,300})/i)

    // Strategy 3: <title> contains the sentence hint
    const titleMatch = html.match(/<title>([^<|–-]{10,200})/)

    // Strategy 4: og:description
    const ogDescMatch = html.match(/property="og:description"\s+content="([^"]{10,300})"/)

    // Strategy 5: JSON-LD structured data
    const jsonLdMatch = html.match(/"text"\s*:\s*"([^"]{10,300})"/)

    const raw = transcriptMatch?.[1]
      ?? sentenceMatch?.[1]
      ?? jsonLdMatch?.[1]
      ?? ogDescMatch?.[1]
      ?? null

    // Clean HTML entities
    function decodeHtml(s: string): string {
      return s
        .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&nbsp;/g, ' ')
        .replace(/\s+/g, ' ').trim()
    }

    const sentence = raw ? decodeHtml(raw) : null
    const titleRaw = titleMatch?.[1]?.trim() ?? null

    return ok({
      sentence,
      hint: sentence ? null : 'Không tìm được câu tự động — hãy paste tay bên dưới',
      title: titleRaw ? decodeHtml(titleRaw) : null,
      source_url: normalized,
    })
  } catch (err) {
    console.error('[POST /api/import/daily-dictation]', err)
    return serverError('Failed to fetch Daily Dictation page')
  }
}
