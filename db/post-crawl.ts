/**
 * post-crawl.ts — Dedup + fill pronunciation, tối ưu batch
 * npx tsx db/post-crawl.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
import postgres from 'postgres'

const IPA: Record<string,string> = {
  'i':"aɪ",'you':"juː",'he':"hiː",'she':"ʃiː",'we':"wiː",'they':"ðeɪ",'it':"ɪt",
  'my':"maɪ",'your':"jɔːr",'me':"miː",'us':"ʌs",'them':"ðɛm",'a':"ə",'an':"æn",'the':"ðə",
  'am':"æm",'is':"ɪz",'are':"ɑːr",'was':"wɒz",
  "i'm":"aɪm","i'd":"aɪd","i'll":"aɪl","i've":"aɪv",
  "it's":"ɪts","that's":"ðæts","what's":"wɒts","there's":"ðɛrz",
  "can't":"kænt","don't":"doʊnt","doesn't":"dʌznt","isn't":"ɪznt",
  "won't":"woʊnt","wouldn't":"wʊdnt","couldn't":"kʊdnt",
  'do':"duː",'did':"dɪd",'does':"dʌz",'go':"ɡoʊ",'want':"wɒnt",'need':"niːd",
  'like':"laɪk",'know':"noʊ",'think':"θɪŋk",'see':"siː",'come':"kʌm",'get':"ɡɛt",
  'make':"meɪk",'take':"teɪk",'give':"ɡɪv",'can':"kæn",'could':"kʊd",
  'will':"wɪl",'would':"wʊd",'should':"ʃʊd",'may':"meɪ",'must':"mʌst",'let':"lɛt",
  'please':"pliːz",'sorry':"ˈsɒri",'thank':"θæŋk",'thanks':"θæŋks",
  'what':"wɒt",'where':"wɛr",'when':"wɛn",'who':"huː",'why':"waɪ",'how':"haʊ",
  'which':"wɪtʃ",'that':"ðæt",'this':"ðɪs",'good':"ɡʊd",'nice':"naɪs",
  'great':"ɡreɪt",'fine':"faɪn",'okay':"oʊˈkeɪ",'ok':"oʊˈkeɪ",'yes':"jɛs",'no':"noʊ",
  'here':"hɪr",'there':"ðɛr",'some':"sʌm",'very':"ˈvɛri",'much':"mʌtʃ",
  'too':"tuː",'so':"soʊ",'just':"dʒʌst",'now':"naʊ",'still':"stɪl",'back':"bæk",
  'for':"fɔːr",'of':"ɒv",'to':"tuː",'with':"wɪð",'by':"baɪ",'from':"frɒm",
  'about':"əˈbaʊt",'if':"ɪf",'not':"nɒt",'help':"hɛlp",'call':"kɔːl",
  'find':"faɪnd",'use':"juːz",'have':"hæv",'has':"hæz",'had':"hæd",'been':"bɪn",
  'time':"taɪm",'day':"deɪ",'way':"weɪ",'right':"raɪt",'money':"ˈmʌni",
  'room':"ruːm",'speak':"spiːk",'talk':"tɔːk",'say':"seɪ",'tell':"tɛl",
  'open':"ˈoʊpən",'close':"kloʊz",'wait':"weɪt",'look':"lʊk",'show':"ʃoʊ",
  'ask':"æsk",'pay':"peɪ",'bring':"brɪŋ",'try':"traɪ",
  'in':"ɪn",'on':"ɒn",'at':"æt",'up':"ʌp",'out':"aʊt",'also':"ˈɔːlsoʊ",
  'never':"ˈnɛvər",'always':"ˈɔːlweɪz",'often':"ˈɒfən",'really':"ˈrɪəli",
}

function toPhonetic(t: string): string {
  return '/' + t.replace(/[?!.,;:'"]/g,' ').trim().split(/\s+/).filter(Boolean)
    .map(w => IPA[w.toLowerCase().replace(/[^a-z']/g,'')] ?? w.toLowerCase()).join(' ') + '/'
}

function fp(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ']/g,' ')
    .split(/\s+/).filter(w=>w.length>1).slice(0,3).join(' ')
}

async function main() {
  const sql = postgres(process.env.DATABASE_URL!, { ssl: 'require', max: 5 })

  // Load all
  console.log('Loading...')
  const rows = await sql<{id:number;topic_id:number;sample_sentence:string;pronunciation:string|null}[]>`
    SELECT id, topic_id, sample_sentence, pronunciation FROM phrases ORDER BY id ASC`
  console.log(`Total: ${rows.length} | No pronunciation: ${rows.filter(r=>!r.pronunciation).length}`)

  // Find dups
  const byTopic = new Map<number, typeof rows>()
  for (const r of rows) {
    if (!r.topic_id) continue
    if (!byTopic.has(r.topic_id)) byTopic.set(r.topic_id, [])
    byTopic.get(r.topic_id)!.push(r)
  }
  const toRemove: number[] = []
  for (const [, ps] of byTopic) {
    const seen = new Map<string,number>()
    for (const p of ps) {
      const f = fp(p.sample_sentence)
      if (seen.has(f)) toRemove.push(p.id)
      else seen.set(f, p.id)
    }
  }
  console.log(`Duplicates: ${toRemove.length}`)

  // Delete dups — single query
  if (toRemove.length > 0) {
    await sql`DELETE FROM phrases WHERE id = ANY(${toRemove})`
    console.log(`✅ Removed ${toRemove.length} duplicates`)
  }

  // Fill pronunciation — single batch UPDATE using VALUES
  const needPron = rows.filter(r => !r.pronunciation && !toRemove.includes(r.id))
  console.log(`Filling pronunciation: ${needPron.length}`)

  if (needPron.length > 0) {
    // Build values list for a single UPDATE ... FROM (VALUES ...) query
    const CHUNK = 500
    for (let i = 0; i < needPron.length; i += CHUNK) {
      const batch = needPron.slice(i, i + CHUNK)
      // Use sql.unsafe for dynamic VALUES list
      const values = batch.map(p => `(${p.id}, '${toPhonetic(p.sample_sentence).replace(/'/g,"''")}')`).join(',')
      await sql.unsafe(`
        UPDATE phrases SET pronunciation = v.pron
        FROM (VALUES ${values}) AS v(pid, pron)
        WHERE phrases.id = v.pid::int
      `)
      console.log(`  Updated ${Math.min(i + CHUNK, needPron.length)}/${needPron.length}`)
    }
    console.log('✅ Pronunciation filled')
  }

  await sql.end()
  console.log('🏁 Done!')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
