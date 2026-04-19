/**
 * fix-phrases.ts — Fix duplicates + generate pronunciation
 * npx tsx db/fix-phrases.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

// Simple phonetic approximation
function toPhonetic(text: string): string {
  const MAP: Record<string,string> = {
    'i':"aɪ",'you':"juː",'he':"hiː",'she':"ʃiː",'we':"wiː",'they':"ðeɪ",
    'it':"ɪt",'my':"maɪ",'your':"jɔːr",'me':"miː",'us':"ʌs",'them':"ðɛm",
    'a':"ə",'an':"æn",'the':"ðə",
    'am':"æm",'is':"ɪz",'are':"ɑːr",'was':"wɒz",
    "i'm":"aɪm","i'd":"aɪd","i'll":"aɪl","i've":"aɪv",
    "it's":"ɪts","that's":"ðæts","what's":"wɒts","there's":"ðɛrz",
    "can't":"kænt","don't":"doʊnt","doesn't":"dʌznt","isn't":"ɪznt",
    "won't":"woʊnt","wouldn't":"wʊdnt","couldn't":"kʊdnt",
    'do':"duː",'does':"dʌz",'did':"dɪd",
    'go':"ɡoʊ",'want':"wɒnt",'need':"niːd",'like':"laɪk",
    'know':"noʊ",'think':"θɪŋk",'see':"siː",'come':"kʌm",
    'get':"ɡɛt",'make':"meɪk",'take':"teɪk",'give':"ɡɪv",
    'can':"kæn",'could':"kʊd",'will':"wɪl",'would':"wʊd",
    'should':"ʃʊd",'may':"meɪ",'must':"mʌst",'let':"lɛt",
    'please':"pliːz",'sorry':"ˈsɒri",'thank':"θæŋk",'thanks':"θæŋks",
    'what':"wɒt",'where':"wɛr",'when':"wɛn",'who':"huː",
    'why':"waɪ",'how':"haʊ",'which':"wɪtʃ",'that':"ðæt",
    'good':"ɡʊd",'nice':"naɪs",'great':"ɡreɪt",'fine':"faɪn",
    'okay':"oʊˈkeɪ",'ok':"oʊˈkeɪ",'yes':"jɛs",'no':"noʊ",
    'here':"hɪr",'there':"ðɛr",'this':"ðɪs",'some':"sʌm",
    'very':"ˈvɛri",'much':"mʌtʃ",'too':"tuː",'so':"soʊ",
    'just':"dʒʌst",'now':"naʊ",'still':"stɪl",'back':"bæk",
    'for':"fɔːr",'of':"ɒv",'to':"tuː",'with':"wɪð",'by':"baɪ",
    'from':"frɒm",'about':"əˈbaʊt",'if':"ɪf",'not':"nɒt",
    'help':"hɛlp",'call':"kɔːl",'find':"faɪnd",'use':"juːz",
    'have':"hæv",'has':"hæz",'had':"hæd",
    'time':"taɪm",'day':"deɪ",'way':"weɪ",'right':"raɪt",
    'money':"ˈmʌni",'room':"ruːm",'table':"ˈteɪbəl",
    'speak':"spiːk",'talk':"tɔːk",'say':"seɪ",'tell':"tɛl",
    'open':"ˈoʊpən",'close':"kloʊz",'wait':"weɪt",'stay':"steɪ",
    'look':"lʊk",'show':"ʃoʊ",'check':"tʃɛk",'book':"bʊk",
    'have':"hæv",'ask':"æsk",'pay':"peɪ",'bring':"brɪŋ",
  }
  const words = text.replace(/[?!.,;:'"]/g,' ').trim().split(/\s+/)
  return '/' + words.map(w => MAP[w.toLowerCase().replace(/[^a-z']/g,'')] || w.toLowerCase()).join(' ') + '/'
}

function fp(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ']/g,' ').split(/\s+/).filter(w=>w.length>1).slice(0,3).join(' ')
}

async function main() {
  const { db } = await import('./index.js')
  const { phrases } = await import('./schema.js')
  const { eq, inArray } = await import('drizzle-orm')

  console.log('Loading phrases...')
  const all = await db.select({ id:phrases.id, topic_id:phrases.topic_id, sample_sentence:phrases.sample_sentence, pronunciation:phrases.pronunciation }).from(phrases)
  console.log('Total:', all.length)

  // ── Step 1: Find & remove duplicates ──
  const toRemove: number[] = []
  const byTopic = new Map<number, typeof all>()
  for (const p of all) {
    if (!p.topic_id) continue
    if (!byTopic.has(p.topic_id)) byTopic.set(p.topic_id, [])
    byTopic.get(p.topic_id)!.push(p)
  }
  for (const [, ps] of byTopic) {
    const seen = new Map<string, number>()
    for (const p of ps) {
      const f = fp(p.sample_sentence)
      if (seen.has(f)) toRemove.push(p.id)
      else seen.set(f, p.id)
    }
  }
  console.log('Duplicates to remove:', toRemove.length)

  if (toRemove.length > 0) {
    const CHUNK = 100
    for (let i = 0; i < toRemove.length; i += CHUNK) {
      await db.delete(phrases).where(inArray(phrases.id, toRemove.slice(i, i+CHUNK)))
    }
    console.log('✅ Removed', toRemove.length, 'duplicates')
  }

  // ── Step 2: Generate pronunciation for null ──
  const needPron = all.filter(p => !p.pronunciation && !toRemove.includes(p.id))
  console.log('Need pronunciation:', needPron.length)

  let updated = 0
  const CHUNK2 = 100
  for (let i = 0; i < needPron.length; i += CHUNK2) {
    const chunk = needPron.slice(i, i+CHUNK2)
    for (const p of chunk) {
      await db.update(phrases).set({ pronunciation: toPhonetic(p.sample_sentence) }).where(eq(phrases.id, p.id))
      updated++
    }
    process.stdout.write(`\r  Pronunciation: ${updated}/${needPron.length}`)
  }
  console.log('\n✅ Updated pronunciation for', updated, 'phrases')
  console.log('Done!')
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
