/**
 * fix-examples-swap.ts — Swap example1 ↔ example1_translation cho các bản ghi bị ngược
 * 
 * Nhận biết "bị ngược": example1 chứa ký tự tiếng Việt (có dấu) → chắc chắn là Vietnamese
 * 
 * Cách chạy: npx tsx db/fix-examples-swap.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

// IPA map (same as fill-examples.ts)
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

/** Detect nếu chuỗi có chứa ký tự tiếng Việt có dấu → là Vietnamese */
function isVietnamese(s: string): boolean {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s)
}

async function main() {
  const { phrases } = await import('./schema.js')
  const { isNotNull, eq } = await import('drizzle-orm')
  const postgres = (await import('postgres')).default
  const { drizzle } = await import('drizzle-orm/postgres-js')

  const client = postgres(process.env.DATABASE_URL!, { max: 1, idle_timeout: 30 })
  const db = drizzle(client)

  // Lấy tất cả phrases có example1
  const rows = await db
    .select({
      id: phrases.id,
      sample_sentence: phrases.sample_sentence,
      example1: phrases.example1,
      example1_translation: phrases.example1_translation,
      example2: phrases.example2,
      example2_translation: phrases.example2_translation,
    })
    .from(phrases)
    .where(isNotNull(phrases.example1))

  console.log(`📊 Total phrases with examples: ${rows.length}`)

  let swapped = 0
  let skipped = 0

  for (const row of rows) {
    const e1 = row.example1 ?? ''
    const v1 = row.example1_translation ?? ''
    const e2 = row.example2 ?? ''
    const v2 = row.example2_translation ?? ''

    // Nếu example1 là Vietnamese và example1_translation là English → bị ngược
    const needSwap = isVietnamese(e1) && !isVietnamese(v1)

    if (!needSwap) {
      skipped++
      continue
    }

    // Sau khi swap: example1 = câu tiếng Anh (v1 cũ), example1_translation = câu tiếng Việt (e1 cũ)
    const newE1 = v1  // tiếng Anh
    const newV1 = e1  // tiếng Việt
    const newE2 = v2  // tiếng Anh
    const newV2 = e2  // tiếng Việt

    await db.update(phrases).set({
      example1: newE1,
      example1_translation: newV1,
      example1_pronunciation: toPhonetic(newE1),
      example2: newE2 || null,
      example2_translation: newV2 || null,
      example2_pronunciation: newE2 ? toPhonetic(newE2) : null,
    }).where(eq(phrases.id, row.id))

    swapped++
    if (swapped % 20 === 0) process.stdout.write(`\r✅ Swapped ${swapped}...`)
  }

  console.log(`\n\n✅ Done!`)
  console.log(`   Swapped: ${swapped}`)
  console.log(`   Skipped (already correct): ${skipped}`)

  await client.end()
  process.exit(0)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
