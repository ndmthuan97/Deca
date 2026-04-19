import { config } from 'dotenv'
config({ path: '.env.local' })

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
    'ask':"æsk",'pay':"peɪ",'bring':"brɪŋ",
    'has':"hæz",'had':"hæd",'been':"bɪn",'being':"ˈbiːɪŋ",
  }
  const words = text.replace(/[?!.,;:'"]/g,' ').trim().split(/\s+/)
  return '/' + words.map(w => MAP[w.toLowerCase().replace(/[^a-z']/g,'')] || w.toLowerCase()).join(' ') + '/'
}

async function main() {
  const { db } = await import('./index.js')
  const { phrases } = await import('./schema.js')
  const { isNull, eq } = await import('drizzle-orm')

  const needPron = await db.select({ id: phrases.id, sample_sentence: phrases.sample_sentence })
    .from(phrases).where(isNull(phrases.pronunciation))

  console.log('Phrases needing pronunciation:', needPron.length)

  let updated = 0
  for (const p of needPron) {
    await db.update(phrases).set({ pronunciation: toPhonetic(p.sample_sentence) }).where(eq(phrases.id, p.id))
    updated++
    if (updated % 100 === 0) process.stdout.write(`\r  ${updated}/${needPron.length}`)
  }
  console.log(`\nDone: updated ${updated}`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
