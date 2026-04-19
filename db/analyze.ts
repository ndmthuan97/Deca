import { config } from 'dotenv'
config({ path: '.env.local' })

function fingerprint(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9 ']/g,' ').split(/\s+/).filter(w=>w.length>1).slice(0,3).join(' ')
}

async function main() {
  const { db } = await import('./index.js')
  const { phrases } = await import('./schema.js')

  const all = await db.select({
    id: phrases.id, topic_id: phrases.topic_id,
    sample_sentence: phrases.sample_sentence, pronunciation: phrases.pronunciation,
  }).from(phrases)

  console.log('Total:', all.length)
  console.log('Null pronunciation:', all.filter(p => !p.pronunciation).length)

  // Find dups per topic
  const groups = new Map<number, typeof all>()
  for (const p of all) {
    if (!p.topic_id) continue
    if (!groups.has(p.topic_id)) groups.set(p.topic_id, [])
    groups.get(p.topic_id)!.push(p)
  }

  const toRemove: number[] = []
  for (const [, ps] of groups) {
    const seen = new Map<string, number>()
    for (const p of ps) {
      const fp = fingerprint(p.sample_sentence)
      if (seen.has(fp)) toRemove.push(p.id)
      else seen.set(fp, p.id)
    }
  }
  console.log('Duplicates found:', toRemove.length)
  console.log('Sample IDs to remove:', toRemove.slice(0, 10))
}
main().catch(console.error)
