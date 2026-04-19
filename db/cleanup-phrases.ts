/**
 * cleanup-phrases.ts — Xử lý 2 vấn đề sau khi crawl:
 * 1. Xóa phrases trùng lặp cấu trúc (cùng topic, same fingerprint 3 words)
 * 2. Điền pronunciation = IPA cho sample_sentence còn null
 *
 * Usage:
 *   npx tsx db/cleanup-phrases.ts --analyze          (chỉ phân tích, không sửa)
 *   npx tsx db/cleanup-phrases.ts --dedup            (xóa duplicate)
 *   npx tsx db/cleanup-phrases.ts --pronunciation    (generate pronunciation)
 *   npx tsx db/cleanup-phrases.ts --all              (cả hai)
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const ANALYZE       = process.argv.includes('--analyze')
const DO_DEDUP      = process.argv.includes('--dedup')  || process.argv.includes('--all')
const DO_PRONUNC    = process.argv.includes('--pronunciation') || process.argv.includes('--all')

// ── Pronunciation helper ─────────────────────────────────────────────────────
// Simple rule-based IPA approximation for common English patterns
// (Không dùng API ngoài — generate offline từ text)
function generatePronunciation(text: string): string {
  // For conversational phrases, pronunciation = simplified phonetic respelling
  // Format: /word word word/ using common English phoneme approximations
  const word = text.toLowerCase().replace(/[?!.,;:'"]/g, '').trim()

  // Common word pronunciation map (most frequent in our dataset)
  const PRONOUNCE_MAP: Record<string, string> = {
    // Articles & pronouns
    'i': 'aɪ', 'you': 'juː', 'he': 'hiː', 'she': 'ʃiː', 'we': 'wiː', 'they': 'ðeɪ',
    'it': 'ɪt', 'my': 'maɪ', 'your': 'jɔːr', 'our': 'aʊər', 'their': 'ðɛr',
    'me': 'miː', 'him': 'hɪm', 'her': 'hɜːr', 'us': 'ʌs', 'them': 'ðɛm',
    'a': 'ə', 'an': 'æn', 'the': 'ðə',
    // Common verbs
    'am': 'æm', 'is': 'ɪz', 'are': 'ɑːr', 'was': 'wɒz', 'were': 'wɜːr',
    'have': 'hæv', "i'm": 'aɪm', "i'd": 'aɪd', "i'll": 'aɪl', "i've": 'aɪv',
    "it's": 'ɪts', "that's": 'ðæts', "what's": 'wɒts', "there's": 'ðɛrz',
    "can't": 'kænt', "don't": 'doʊnt', "doesn't": 'dʌznt', "isn't": 'ɪznt',
    "won't": 'woʊnt', "wouldn't": 'wʊdnt', "couldn't": 'kʊdnt', "shouldn't": 'ʃʊdnt',
    'do': 'duː', 'does': 'dʌz', 'did': 'dɪd', 'done': 'dʌn',
    'go': 'ɡoʊ', 'going': 'ɡoʊɪŋ', 'want': 'wɒnt', 'need': 'niːd',
    'like': 'laɪk', 'love': 'lʌv', 'know': 'noʊ', 'think': 'θɪŋk',
    'see': 'siː', 'come': 'kʌm', 'get': 'ɡɛt', 'make': 'meɪk',
    'take': 'teɪk', 'give': 'ɡɪv', 'tell': 'tɛl', 'ask': 'æsk',
    'help': 'hɛlp', 'use': 'juːz', 'find': 'faɪnd', 'call': 'kɔːl',
    'can': 'kæn', 'could': 'kʊd', 'will': 'wɪl', 'would': 'wʊd',
    'should': 'ʃʊd', 'may': 'meɪ', 'might': 'maɪt', 'must': 'mʌst',
    'shall': 'ʃæl', 'let': 'lɛt', 'please': 'pliːz', 'sorry': 'sɒri',
    'thank': 'θæŋk', 'thanks': 'θæŋks',
    // Common question words
    'what': 'wɒt', 'where': 'wɛr', 'when': 'wɛn', 'who': 'huː',
    'why': 'waɪ', 'how': 'haʊ', 'which': 'wɪtʃ', 'that': 'ðæt',
    // Misc frequent
    'good': 'ɡʊd', 'nice': 'naɪs', 'great': 'ɡreɪt', 'fine': 'faɪn',
    'ok': 'oʊˈkeɪ', 'okay': 'oʊˈkeɪ', 'yes': 'jɛs', 'no': 'noʊ',
    'here': 'hɪr', 'there': 'ðɛr', 'this': 'ðɪs', 'these': 'ðiːz',
    'some': 'sʌm', 'any': 'ɛni', 'all': 'ɔːl', 'more': 'mɔːr',
    'very': 'ˈvɛri', 'much': 'mʌtʃ', 'many': 'ˈmɛni', 'too': 'tuː',
    'also': 'ˈɔːlsoʊ', 'so': 'soʊ', 'just': 'dʒʌst', 'now': 'naʊ',
    'still': 'stɪl', 'again': 'əˈɡɛn', 'back': 'bæk', 'out': 'aʊt',
    'up': 'ʌp', 'down': 'daʊn', 'in': 'ɪn', 'on': 'ɒn', 'at': 'æt',
    'for': 'fɔːr', 'of': 'ɒv', 'to': 'tuː', 'with': 'wɪð', 'by': 'baɪ',
    'from': 'frɒm', 'about': 'əˈbaʊt', 'if': 'ɪf', 'not': 'nɒt',
    'time': 'taɪm', 'day': 'deɪ', 'way': 'weɪ', 'right': 'raɪt',
  }

  const words = text.replace(/[?!.,;:'"]/g, ' ').trim().split(/\s+/)
  const phonetic = words.map(w => {
    const lower = w.toLowerCase().replace(/[^a-z']/g, '')
    return PRONOUNCE_MAP[lower] || lower
  })

  return '/' + phonetic.join(' ') + '/'
}

// ── Structural fingerprint (same logic as crawl script) ─────────────────────
function fingerprint(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9 ']/g, ' ')
    .split(/\s+/).filter(w => w.length > 1)
    .slice(0, 3).join(' ')
}

// ── Main ─────────────────────────────────────────────────────────────────────
async function main() {
  const { db } = await import('./index.js')
  const { phrases } = await import('./schema.js')
  const { eq, isNull, inArray } = await import('drizzle-orm')

  // ── Load all phrases ────────────────────────────────────────────────────────
  console.log('📊 Loading all phrases...')
  const allPhrases = await db.select({
    id: phrases.id,
    topic_id: phrases.topic_id,
    sample_sentence: phrases.sample_sentence,
    translation: phrases.translation,
    pronunciation: phrases.pronunciation,
    structure: phrases.structure,
  }).from(phrases)

  console.log(`Total: ${allPhrases.length} phrases`)

  // ── ANALYSIS ────────────────────────────────────────────────────────────────
  const nullPronunc = allPhrases.filter(p => !p.pronunciation)
  const nullStruct  = allPhrases.filter(p => !p.structure)
  console.log(`\nNull pronunciation: ${nullPronunc.length}`)
  console.log(`Null structure:     ${nullStruct.length}`)

  // Find structural duplicates within each topic
  const dupsByTopic: Map<number, { keepId: number; deleteIds: number[] }[]> = new Map()
  const groupedByTopic = new Map<number, typeof allPhrases>()
  for (const p of allPhrases) {
    if (!p.topic_id) continue
    if (!groupedByTopic.has(p.topic_id)) groupedByTopic.set(p.topic_id, [])
    groupedByTopic.get(p.topic_id)!.push(p)
  }

  let totalDups = 0
  const idsToDelete: number[] = []

  for (const [topicId, topicPhrases] of groupedByTopic) {
    const fpSeen = new Map<string, number>() // fp -> first id
    const dups: { keepId: number; deleteIds: number[] }[] = []

    for (const p of topicPhrases) {
      const fp = fingerprint(p.sample_sentence)
      if (fpSeen.has(fp)) {
        // This is a duplicate — mark for deletion
        const keepId = fpSeen.get(fp)!
        let group = dups.find(d => d.keepId === keepId)
        if (!group) { group = { keepId, deleteIds: [] }; dups.push(group) }
        group.deleteIds.push(p.id)
        idsToDelete.push(p.id)
        totalDups++
      } else {
        fpSeen.set(fp, p.id)
      }
    }

    if (dups.length > 0) dupsByTopic.set(topicId, dups)
  }

  console.log(`\nDuplicate phrases to remove: ${totalDups}`)

  if (ANALYZE) {
    console.log('\n── Sample duplicates ──')
    let shown = 0
    for (const [topicId, dups] of dupsByTopic) {
      for (const { keepId, deleteIds } of dups) {
        const keep = allPhrases.find(p => p.id === keepId)
        const deletes = allPhrases.filter(p => deleteIds.includes(p.id))
        console.log(`\nTopic ${topicId}: KEEP id=${keepId} "${keep?.sample_sentence?.slice(0, 50)}"`)
        for (const d of deletes) {
          console.log(`  DELETE id=${d.id} "${d.sample_sentence?.slice(0, 50)}"`)
        }
        shown++
        if (shown >= 10) { console.log('... (showing first 10 groups)'); break }
      }
      if (shown >= 10) break
    }
    console.log('\n[ANALYZE mode — no changes made. Run with --dedup or --all to apply]')
    process.exit(0)
  }

  // ── DEDUP ───────────────────────────────────────────────────────────────────
  if (DO_DEDUP && idsToDelete.length > 0) {
    console.log(`\n🗑️  Deleting ${idsToDelete.length} duplicate phrases...`)

    // Batch delete in chunks of 100
    const CHUNK = 100
    let deleted = 0
    for (let i = 0; i < idsToDelete.length; i += CHUNK) {
      const chunk = idsToDelete.slice(i, i + CHUNK)
      await db.delete(phrases).where(inArray(phrases.id, chunk))
      deleted += chunk.length
      process.stdout.write(`\r   Deleted ${deleted}/${idsToDelete.length}...`)
    }
    console.log(`\n✅ Deleted ${deleted} duplicates`)
  }

  // ── PRONUNCIATION ────────────────────────────────────────────────────────────
  if (DO_PRONUNC) {
    // Only fill phrases that have null pronunciation (all crawled data)
    const needPronunc = allPhrases.filter(p =>
      !p.pronunciation && p.sample_sentence
    )
    console.log(`\n🔤 Generating pronunciation for ${needPronunc.length} phrases...`)

    const CHUNK = 50
    let updated = 0

    for (let i = 0; i < needPronunc.length; i += CHUNK) {
      const chunk = needPronunc.slice(i, i + CHUNK)

      // Update each in a batch using individual updates
      for (const p of chunk) {
        const pronunc = generatePronunciation(p.sample_sentence)
        await db.update(phrases)
          .set({ pronunciation: pronunc })
          .where(eq(phrases.id, p.id))
        updated++
      }
      process.stdout.write(`\r   Updated ${updated}/${needPronunc.length}...`)
    }
    console.log(`\n✅ Generated pronunciation for ${updated} phrases`)
  }

  console.log('\n🏁 Cleanup done!')
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
