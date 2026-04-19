import { db } from '@/db'
import { phrases } from '@/db/schema'
import { isNull, eq, inArray } from 'drizzle-orm'

// ── Route config: extend timeout to 5 min for long AI batch jobs ──
export const maxDuration = 300  // seconds (requires Vercel Pro/hobby plan on prod; dev: no limit)

// ── IPA phonetic map ──────────────────────────────────────────────────────────
const IPA: Record<string, string> = {
  'i':"aɪ",'you':"juː",'he':"hiː",'she':"ʃiː",'we':"wiː",'they':"ðeɪ",
  'it':"ɪt",'my':"maɪ",'your':"jɔːr",'me':"miː",'us':"ʌs",'them':"ðɛm",
  'a':"ə",'an':"æn",'the':"ðə",'am':"æm",'is':"ɪz",'are':"ɑːr",'was':"wɒz",
  "i'm":"aɪm","i'd":"aɪd","i'll":"aɪl","i've":"aɪv",
  "it's":"ɪts","that's":"ðæts","what's":"wɒts","there's":"ðɛrz",
  "can't":"kænt","don't":"doʊnt","doesn't":"dʌznt","isn't":"ɪznt",
  "won't":"woʊnt","wouldn't":"wʊdnt","couldn't":"kʊdnt",
  'do':"duː",'did':"dɪd",'does':"dʌz",'go':"ɡoʊ",'want':"wɒnt",
  'need':"niːd",'like':"laɪk",'know':"noʊ",'think':"θɪŋk",'see':"siː",
  'come':"kʌm",'get':"ɡɛt",'make':"meɪk",'take':"teɪk",'give':"ɡɪv",
  'can':"kæn",'could':"kʊd",'will':"wɪl",'would':"wʊd",'should':"ʃʊd",
  'may':"meɪ",'must':"mʌst",'let':"lɛt",'please':"pliːz",
  'sorry':"ˈsɒri",'thank':"θæŋk",'thanks':"θæŋks",
  'what':"wɒt",'where':"wɛr",'when':"wɛn",'who':"huː",
  'why':"waɪ",'how':"haʊ",'which':"wɪtʃ",'that':"ðæt",'this':"ðɪs",
  'good':"ɡʊd",'nice':"naɪs",'great':"ɡreɪt",'fine':"faɪn",
  'okay':"oʊˈkeɪ",'ok':"oʊˈkeɪ",'yes':"jɛs",'no':"noʊ",
  'here':"hɪr",'there':"ðɛr",'some':"sʌm",'very':"ˈvɛri",
  'much':"mʌtʃ",'too':"tuː",'so':"soʊ",'just':"dʒʌst",
  'now':"naʊ",'still':"stɪl",'back':"bæk",'for':"fɔːr",
  'of':"ɒv",'to':"tuː",'with':"wɪð",'by':"baɪ",'from':"frɒm",
  'about':"əˈbaʊt",'if':"ɪf",'not':"nɒt",'help':"hɛlp",
  'call':"kɔːl",'find':"faɪnd",'use':"juːz",'have':"hæv",
  'has':"hæz",'had':"hæd",'been':"bɪn",'time':"taɪm",
  'day':"deɪ",'way':"weɪ",'right':"raɪt",'money':"ˈmʌni",
  'room':"ruːm",'speak':"spiːk",'talk':"tɔːk",'say':"seɪ",'tell':"tɛl",
  'open':"ˈoʊpən",'close':"kloʊz",'wait':"weɪt",'look':"lʊk",
  'show':"ʃoʊ",'ask':"æsk",'pay':"peɪ",'bring':"brɪŋ",'try':"traɪ",
  'in':"ɪn",'on':"ɒn",'at':"æt",'up':"ʌp",'out':"aʊt",
  'never':"ˈnɛvər",'always':"ˈɔːlweɪz",'often':"ˈɒfən",
  'really':"ˈrɪəli",'already':"ɔːlˈrɛdi",'also':"ˈɔːlsoʊ",
  'something':"ˈsʌmθɪŋ",'anything':"ˈɛniθɪŋ",'nothing':"ˈnʌθɪŋ",
  'someone':"ˈsʌmwʌn",'anyone':"ˈɛniwʌn",'everyone':"ˈɛvriwʌn",
  'put':"pʊt",'keep':"kiːp",'leave':"liːv",'work':"wɜːrk",
  'all':"ɔːl",'both':"boʊθ",'each':"iːtʃ",'every':"ˈɛvri",
  'new':"njuː",'old':"oʊld",'long':"lɒŋ",'only':"ˈoʊnli",
  'before':"bɪˈfɔːr",'after':"ˈæftər",'without':"wɪˈðaʊt",
  'between':"bɪˈtwiːn",'through':"θruː",'into':"ˈɪntuː",
  'book':"bʊk",'check':"tʃɛk",'then':"ðɛn",'than':"ðæn",
}

function toPhonetic(text: string): string {
  return '/' + text.replace(/[?!.,;:'"]/g, ' ').trim()
    .split(/\s+/).filter(Boolean)
    .map(w => IPA[w.toLowerCase().replace(/[^a-z']/g, '')] ?? w.toLowerCase())
    .join(' ') + '/'
}

function fingerprint(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ']/g, ' ')
    .split(/\s+/).filter(w => w.length > 1).slice(0, 3).join(' ')
}

async function generateExamples(phrase: string, translation: string, retries = 1): Promise<{example1: string; example1_translation: string; example2: string; example2_translation: string} | null> {
  if (!process.env.AI_API_KEY) return null
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.AI_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.4,
          max_tokens: 180,
          messages: [{
            role: 'user',
            content: `Phrase: "${phrase}" (= ${translation})\nWrite 2 short natural example sentences. JSON only:\n{"e1":"...","v1":"...","e2":"...","v2":"..."}`,
          }]
        })
      })
      // Handle rate-limit: wait and retry
      if (res.status === 429) {
        if (attempt < retries) { await new Promise(r => setTimeout(r, 2000)); continue }
        return null
      }
      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      const json = JSON.parse(data.choices?.[0]?.message?.content?.trim() ?? '{}') as { e1?: string; v1?: string; e2?: string; v2?: string }
      if (!json.e1 || !json.v1 || !json.e2 || !json.v2) return null
      return { example1: json.e1, example1_translation: json.v1, example2: json.e2, example2_translation: json.v2 }
    } catch {
      if (attempt < retries) { await new Promise(r => setTimeout(r, 1000)); continue }
      return null
    }
  }
  return null
}

// ── SSE event helper ─────────────────────────────────────────────────────────
type SSEEvent = { type: 'progress'; step: string; current: number; total: number; label: string }
              | { type: 'done'; summary: string }
              | { type: 'error'; message: string }

function encode(event: SSEEvent): string {
  return `data: ${JSON.stringify(event)}\n\n`
}

// ── GET — stats ───────────────────────────────────────────────────────────────
export async function GET() {
  const all = await db.select({ id: phrases.id, pronunciation: phrases.pronunciation, example1: phrases.example1 }).from(phrases)
  return Response.json({
    statusCode: 200, message: 'Stats',
    data: { total: all.length, null_pronunciation: all.filter(p => !p.pronunciation).length, null_example1: all.filter(p => !p.example1).length },
    errors: null,
  })
}

// ── POST — streaming SSE ─────────────────────────────────────────────────────
export async function POST(request: Request) {
  const { action, limit = 99999 } = await request.json() as { action: string; limit?: number }

  const stream = new ReadableStream({
    async start(controller) {
      const send = (event: SSEEvent) => controller.enqueue(new TextEncoder().encode(encode(event)))

      try {
        const summary: string[] = []

        // ── DEDUP ─────────────────────────────────────────────────────────────
        if (action === 'dedup' || action === 'all') {
          send({ type: 'progress', step: 'dedup', current: 0, total: 1, label: 'Đang phân tích duplicates...' })

          const all = await db.select({ id: phrases.id, topic_id: phrases.topic_id, sample_sentence: phrases.sample_sentence }).from(phrases)
          const byTopic = new Map<number, typeof all>()
          for (const p of all) {
            if (!p.topic_id) continue
            if (!byTopic.has(p.topic_id)) byTopic.set(p.topic_id, [])
            byTopic.get(p.topic_id)!.push(p)
          }
          const toRemove: number[] = []
          for (const [, ps] of byTopic) {
            const sorted = [...ps].sort((a, b) => a.id - b.id)
            const seen = new Map<string, number>()
            for (const p of sorted) {
              const f = fingerprint(p.sample_sentence)
              if (seen.has(f)) toRemove.push(p.id)
              else seen.set(f, p.id)
            }
          }

          send({ type: 'progress', step: 'dedup', current: 0, total: toRemove.length || 1, label: `Tìm thấy ${toRemove.length} duplicates, đang xóa...` })

          const CHUNK = 200
          let removed = 0
          for (let i = 0; i < toRemove.length; i += CHUNK) {
            await db.delete(phrases).where(inArray(phrases.id, toRemove.slice(i, i + CHUNK)))
            removed += Math.min(CHUNK, toRemove.length - i)
            send({ type: 'progress', step: 'dedup', current: removed, total: toRemove.length, label: `Xóa duplicate ${removed}/${toRemove.length}` })
          }

          summary.push(`Dedup: xóa ${toRemove.length} câu trùng`)
          send({ type: 'progress', step: 'dedup', current: toRemove.length || 1, total: toRemove.length || 1, label: `✓ Xóa xong ${toRemove.length} duplicates` })
        }

        // ── PRONUNCIATION ─────────────────────────────────────────────────────
        if (action === 'pronunciation' || action === 'all') {
          const needPron = await db.select({ id: phrases.id, sample_sentence: phrases.sample_sentence })
            .from(phrases).where(isNull(phrases.pronunciation))

          send({ type: 'progress', step: 'pronunciation', current: 0, total: needPron.length || 1, label: `Fill pronunciation: ${needPron.length} câu` })

          const CHUNK = 50
          let updated = 0
          for (let i = 0; i < needPron.length; i += CHUNK) {
            const batch = needPron.slice(i, i + CHUNK)
            for (const p of batch) {
              await db.update(phrases).set({ pronunciation: toPhonetic(p.sample_sentence) }).where(eq(phrases.id, p.id))
              updated++
            }
            send({ type: 'progress', step: 'pronunciation', current: updated, total: needPron.length, label: `Pronunciation ${updated}/${needPron.length}` })
          }

          summary.push(`Pronunciation: cập nhật ${updated} câu`)
          send({ type: 'progress', step: 'pronunciation', current: needPron.length || 1, total: needPron.length || 1, label: `✓ Pronunciation xong (${updated} câu)` })
        }

        // ── EXAMPLES via Groq ─────────────────────────────────────────────────
        if (action === 'examples' || action === 'all') {
          const needEx = await db.select({ id: phrases.id, sample_sentence: phrases.sample_sentence, translation: phrases.translation })
            .from(phrases).where(isNull(phrases.example1)).limit(limit)

          send({ type: 'progress', step: 'examples', current: 0, total: needEx.length || 1, label: `Generate examples: ${needEx.length} câu (Groq AI — 10 concurrent)` })

          const CONCURRENCY = 20  // 20 requests song song (Groq free: ~30 RPM, paid: much higher)
          let exUpdated = 0
          let processed = 0

          for (let i = 0; i < needEx.length; i += CONCURRENCY) {
            const batch = needEx.slice(i, i + CONCURRENCY).filter(p => !!p.translation)

            const results = await Promise.allSettled(
              batch.map(p => generateExamples(p.sample_sentence, p.translation!))
            )

            await Promise.all(
              results.map(async (res, idx) => {
                processed++
                if (res.status === 'fulfilled' && res.value) {
                  const ex = res.value
                  const p  = batch[idx]
                  await db.update(phrases).set({
                    example1: ex.example1,
                    example1_translation: ex.example1_translation,
                    example1_pronunciation: toPhonetic(ex.example1),
                    example2: ex.example2,
                    example2_translation: ex.example2_translation,
                    example2_pronunciation: toPhonetic(ex.example2),
                  }).where(eq(phrases.id, p.id))
                  exUpdated++
                }
              })
            )

            send({
              type: 'progress', step: 'examples',
              current: processed, total: needEx.length,
              label: `Examples ${processed}/${needEx.length} — thành công: ${exUpdated}`,
            })
            // Nhỏ delay chỉ khi gần rate-limit (free tier ~30 RPM)
            // Với paid tier: bỏ delay này hoàn toàn
            if (i + CONCURRENCY < needEx.length) await new Promise(r => setTimeout(r, 200))
          }

          summary.push(`Examples: generate ${exUpdated}/${needEx.length} câu`)
          send({ type: 'progress', step: 'examples', current: needEx.length || 1, total: needEx.length || 1, label: `✓ Examples xong (${exUpdated} câu thành công)` })
        }

        send({ type: 'done', summary: summary.join(' | ') })
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        send({ type: 'error', message: msg })
      } finally {
        controller.close()
      }
    }
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  })
}
