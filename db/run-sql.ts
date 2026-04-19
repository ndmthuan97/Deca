/**
 * run-sql.ts — Execute raw SQL for cleanup
 */
import { config } from 'dotenv'
config({ path: '.env.local' })
import pkg from 'pg'
const { Client } = pkg

const IPA: Record<string, string> = {
  'i':"aɪ",'you':"juː",'he':"hiː",'she':"ʃiː",'we':"wiː",'they':"ðeɪ",
  'it':"ɪt",'my':"maɪ",'your':"jɔːr",'me':"miː",'us':"ʌs",'them':"ðɛm",
  'a':"ə",'an':"æn",'the':"ðə",'am':"æm",'is':"ɪz",'are':"ɑːr",
  "i'm":"aɪm","i'd":"aɪd","i'll":"aɪl","i've":"aɪv",
  "it's":"ɪts","that's":"ðæts","what's":"wɒts","there's":"ðɛrz",
  "can't":"kænt","don't":"doʊnt","doesn't":"dʌznt","isn't":"ɪznt",
  "won't":"woʊnt","wouldn't":"wʊdnt","couldn't":"kʊdnt",
  'do':"duː",'did':"dɪd",'does':"dʌz",
  'go':"ɡoʊ",'want':"wɒnt",'need':"niːd",'like':"laɪk",
  'know':"noʊ",'think':"θɪŋk",'see':"siː",'come':"kʌm",
  'get':"ɡɛt",'make':"meɪk",'take':"teɪk",'give':"ɡɪv",
  'can':"kæn",'could':"kʊd",'will':"wɪl",'would':"wʊd",
  'should':"ʃʊd",'may':"meɪ",'must':"mʌst",'let':"lɛt",
  'please':"pliːz",'sorry':"ˈsɒri",'thank':"θæŋk",'thanks':"θæŋks",
  'what':"wɒt",'where':"wɛr",'when':"wɛn",'who':"huː",
  'why':"waɪ",'how':"haʊ",'which':"wɪtʃ",'that':"ðæt",'this':"ðɪs",
  'good':"ɡʊd",'nice':"naɪs",'great':"ɡreɪt",'fine':"faɪn",
  'okay':"oʊˈkeɪ",'ok':"oʊˈkeɪ",'yes':"jɛs",'no':"noʊ",
  'here':"hɪr",'there':"ðɛr",'some':"sʌm",
  'very':"ˈvɛri",'much':"mʌtʃ",'too':"tuː",'so':"soʊ",
  'just':"dʒʌst",'now':"naʊ",'still':"stɪl",'back':"bæk",
  'for':"fɔːr",'of':"ɒv",'to':"tuː",'with':"wɪð",'by':"baɪ",
  'from':"frɒm",'about':"əˈbaʊt",'if':"ɪf",'not':"nɒt",
  'help':"hɛlp",'call':"kɔːl",'find':"faɪnd",'use':"juːz",
  'have':"hæv",'has':"hæz",'had':"hæd",'been':"bɪn",
  'time':"taɪm",'day':"deɪ",'way':"weɪ",'right':"raɪt",
  'money':"ˈmʌni",'room':"ruːm",'table':"ˈteɪbəl",
  'speak':"spiːk",'talk':"tɔːk",'say':"seɪ",'tell':"tɛl",
  'open':"ˈoʊpən",'close':"kloʊz",'wait':"weɪt",'stay':"steɪ",
  'look':"lʊk",'show':"ʃoʊ",'check':"tʃɛk",'book':"bʊk",
  'ask':"æsk",'pay':"peɪ",'bring':"brɪŋ",'try':"traɪ",
  'in':"ɪn",'on':"ɒn",'at':"æt",'up':"ʌp",'out':"aʊt",
  'never':"ˈnɛvər",'always':"ˈɔːlweɪz",'often':"ˈɒfən",
  'really':"ˈrɪəli",'already':"ɔːlˈrɛdi",
  'something':"ˈsʌmθɪŋ",'anything':"ˈɛniθɪŋ",'nothing':"ˈnʌθɪŋ",
  'someone':"ˈsʌmwʌn",'anyone':"ˈɛniwʌn",'everyone':"ˈɛvriwʌn",
}

function toPhonetic(text: string): string {
  const words = text.replace(/[?!.,;:'"]/g, ' ').trim().split(/\s+/).filter(Boolean)
  return '/' + words.map(w => IPA[w.toLowerCase().replace(/[^a-z']/g, '')] ?? w.toLowerCase()).join(' ') + '/'
}

function fingerprint(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ']/g, ' ')
    .split(/\s+/).filter(w => w.length > 1).slice(0, 3).join(' ')
}

async function main() {
  const client = new Client({ connectionString: process.env.DATABASE_URL, ssl: { rejectUnauthorized: false } })
  await client.connect()
  console.log('✅ Connected to DB')

  // ── Step 1: Load all phrases ─────────────────────────────────────────────
  const { rows } = await client.query<{ id: number; topic_id: number; sample_sentence: string; pronunciation: string | null }>(
    'SELECT id, topic_id, sample_sentence, pronunciation FROM phrases ORDER BY id ASC'
  )
  console.log(`Total: ${rows.length} | Null pronunciation: ${rows.filter(r => !r.pronunciation).length}`)

  // ── Step 2: Find duplicates ───────────────────────────────────────────────
  const byTopic = new Map<number, typeof rows>()
  for (const r of rows) {
    if (!r.topic_id) continue
    if (!byTopic.has(r.topic_id)) byTopic.set(r.topic_id, [])
    byTopic.get(r.topic_id)!.push(r)
  }

  const toRemove: number[] = []
  for (const [, ps] of byTopic) {
    const seen = new Map<string, number>()
    for (const p of ps) {
      const f = fingerprint(p.sample_sentence)
      if (seen.has(f)) toRemove.push(p.id)
      else seen.set(f, p.id)
    }
  }
  console.log(`Duplicates: ${toRemove.length}`)

  // ── Step 3: Delete duplicates ─────────────────────────────────────────────
  if (toRemove.length > 0) {
    const CHUNK = 500
    let removed = 0
    for (let i = 0; i < toRemove.length; i += CHUNK) {
      const chunk = toRemove.slice(i, i + CHUNK)
      await client.query(`DELETE FROM phrases WHERE id = ANY($1)`, [chunk])
      removed += chunk.length
    }
    console.log(`✅ Removed ${removed} duplicates`)
  }

  // ── Step 4: Fill pronunciation in batches ─────────────────────────────────
  const needPron = rows.filter(r => !r.pronunciation && !toRemove.includes(r.id))
  console.log(`Fill pronunciation: ${needPron.length} phrases`)

  const CHUNK2 = 100
  let updated = 0
  for (let i = 0; i < needPron.length; i += CHUNK2) {
    const batch = needPron.slice(i, i + CHUNK2)
    // Build a single UPDATE with CASE WHEN for efficiency
    const caseWhen = batch.map((p, idx) => `WHEN id = $${idx * 2 + 1} THEN $${idx * 2 + 2}`).join(' ')
    const ids = batch.map(p => p.id)
    const params: (number | string)[] = []
    batch.forEach(p => { params.push(p.id); params.push(toPhonetic(p.sample_sentence)) })
    await client.query(
      `UPDATE phrases SET pronunciation = CASE ${caseWhen} END WHERE id = ANY($${params.length + 1})`,
      [...params, ids]
    )
    updated += batch.length
    process.stdout.write(`\r  ${updated}/${needPron.length}`)
  }
  console.log(`\n✅ Pronunciation updated: ${updated}`)

  await client.end()
  console.log('🏁 Done!')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
