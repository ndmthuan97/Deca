/**
 * fill-examples.ts — Generate example sentences via Groq for phrases missing example1
 * 
 * Cách chạy:
 *   npx tsx db/fill-examples.ts
 *
 * Strategy: Sequential batching với rate-limit awareness
 * - Groq free: ~30 RPM → 1 req/2s safe, hoặc burst 10 rồi wait
 * - Không dùng concurrency cao → tránh 429, không cần retry phức tạp
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

// ── IPA phonetic map ──────────────────────────────────────────────────────
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
}

function toPhonetic(text: string): string {
  return '/' + text.replace(/[?!.,;:'"]/g, ' ').trim()
    .split(/\s+/).filter(Boolean)
    .map(w => IPA[w.toLowerCase().replace(/[^a-z']/g, '')] ?? w.toLowerCase())
    .join(' ') + '/'
}

// ── Groq call — single sequential request ───────────────────────────────
async function generateExamples(phrase: string, translation: string): Promise<{
  example1: string; example1_translation: string
  example2: string; example2_translation: string
} | null> {
  const apiKey = process.env.AI_API_KEY
  if (!apiKey) throw new Error('AI_API_KEY not set in .env.local')

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'llama-3.1-8b-instant',
          temperature: 0.4,
          max_tokens: 200,
          response_format: { type: 'json_object' },  // Force valid JSON — no markdown wrapping
          messages: [
            {
              role: 'system',
              content: 'You are an English teacher. Output ONLY valid JSON. No markdown, no explanation.',
            },
            {
              role: 'user',
              content: `Create 2 different example sentences using the English phrase "${phrase}" (meaning: ${translation}).\nRULES: Each sentence must be a COMPLETE sentence using the phrase in context. Do NOT repeat the phrase itself as the sentence. The 2 examples must be different from each other.\nJSON: {"e1":"complete example sentence 1","v1":"Vietnamese translation","e2":"complete example sentence 2","v2":"Vietnamese translation"}`,
            },
          ],
        }),
      })

      if (res.status === 429) {
        const wait = attempt === 0 ? 3000 : 8000
        process.stdout.write(` [429 wait ${wait/1000}s]`)
        await new Promise(r => setTimeout(r, wait))
        continue
      }

      if (!res.ok) {
        process.stdout.write(` [HTTP ${res.status}]`)
        return null
      }

      const data = await res.json() as { choices?: Array<{ message?: { content?: string } }> }
      const raw = data.choices?.[0]?.message?.content?.trim() ?? '{}'
      const json = JSON.parse(raw) as { e1?: string; v1?: string; e2?: string; v2?: string }
      if (!json.e1 || !json.v1 || !json.e2 || !json.v2) return null
      return {
        example1: json.e1,
        example1_translation: json.v1,
        example2: json.e2,
        example2_translation: json.v2,
      }
    } catch (e) {
      if (attempt < 2) { await new Promise(r => setTimeout(r, 1000)); continue }
      process.stdout.write(` [err: ${String(e).slice(0, 40)}]`)
      return null
    }
  }
  return null
}

// ── Main ─────────────────────────────────────────────────────────────────
async function main() {
  const { phrases } = await import('./schema.js')
  const { isNull, eq } = await import('drizzle-orm')
  const postgres = (await import('postgres')).default

  // Helper: tạo fresh client — tránh ECONNRESET do connection cũ bị Supabase đóng
  function makeClient() {
    const client = postgres(process.env.DATABASE_URL!, {
      max: 1,
      idle_timeout: 30,
      connect_timeout: 15,
    })
    const { drizzle } = require('drizzle-orm/postgres-js')
    return { client, db: drizzle(client, {}) }
  }

  let { client, db } = makeClient()

  console.log('🔍 Scanning Supabase for phrases missing example1...')
  const needEx = await db
    .select({ id: phrases.id, sample_sentence: phrases.sample_sentence, translation: phrases.translation })
    .from(phrases)
    .where(isNull(phrases.example1))

  const withTranslation = needEx.filter((p: { translation: string | null }) => !!p.translation)
  const total = withTranslation.length
  console.log(`📊 Found: ${needEx.length} missing examples | ${total} have translation (will process)`)
  console.log(`⏱  Estimated time @ ~1 req/s: ~${Math.ceil(total / 60)} min\n`)

  if (total === 0) { console.log('✅ Nothing to do!'); process.exit(0) }

  let success = 0
  let failed = 0
  const startTime = Date.now()

  for (let i = 0; i < total; i++) {
    const p = withTranslation[i]
    const pct = Math.round(((i + 1) / total) * 100)
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
    const eta = i > 0 ? Math.ceil((Date.now() - startTime) / 1000 / i * (total - i)) : 0

    process.stdout.write(`\r[${pct}%] ${i + 1}/${total} | ✅ ${success} ❌ ${failed} | ${elapsed}s | ETA ~${eta}s  `)

    const result = await generateExamples(p.sample_sentence, p.translation!)
    if (result) {
      // Retry DB write 3 lần, reconnect khi ECONNRESET
      let written = false
      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          await db.update(phrases).set({
            example1: result.example1,
            example1_translation: result.example1_translation,
            example1_pronunciation: toPhonetic(result.example1),
            example2: result.example2,
            example2_translation: result.example2_translation,
            example2_pronunciation: toPhonetic(result.example2),
          }).where(eq(phrases.id, p.id))
          written = true
          break
        } catch (e: unknown) {
          const code = (e as { code?: string })?.code
          if ((code === 'ECONNRESET' || code === 'ECONNREFUSED') && attempt < 2) {
            process.stdout.write(` [reconnect...]`)
            try { await client.end({ timeout: 3 }) } catch { /* ignore */ }
            await new Promise(r => setTimeout(r, 2000));
            ({ client, db } = makeClient())  // fresh connection
          } else {
            process.stdout.write(` [DB err: ${String(e).slice(0, 50)}]`)
            break
          }
        }
      }
      if (written) success++
      else failed++
    } else {
      failed++
    }

    // 100ms delay — nhường CPU + tránh burst quá mức
    // Groq tự động rate-limit và retry logic ở trên xử lý 429
    await new Promise(r => setTimeout(r, 100))
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1)
  console.log(`\n\n✅ Done in ${totalTime}s`)
  console.log(`   Success: ${success}/${total}`)
  console.log(`   Failed:  ${failed}/${total}`)
  process.exit(0)
}

main().catch(e => { console.error('\n❌', e); process.exit(1) })
