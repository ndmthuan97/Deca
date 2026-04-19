import { config } from 'dotenv'
config({ path: '.env.local' })

async function main() {
  const { db } = await import('./index.js')
  const { topics, phrases } = await import('./schema.js')
  const { sql } = await import('drizzle-orm')

  // Scan topics
  const topicRows = await db.select({
    id:           topics.id,
    name:         topics.name,
    slug:         topics.slug,
    icon:         topics.icon,
    order_index:  topics.order_index,
  }).from(topics).orderBy(topics.id)

  console.log('\n=== TOPICS ===')
  console.table(topicRows)

  // Count phrases per topic
  const phraseCounts = await db
    .select({
      topic_id: phrases.topic_id,
      count: sql<number>`count(*)`.as('count'),
    })
    .from(phrases)
    .groupBy(phrases.topic_id)
    .orderBy(phrases.topic_id)

  console.log('\n=== PHRASE COUNT PER TOPIC ===')
  console.table(phraseCounts)

  // Sample 5 phrases
  const samplePhrases = await db.select({
    id:              phrases.id,
    topic_id:        phrases.topic_id,
    type:            phrases.type,
    sample_sentence: phrases.sample_sentence,
    translation:     phrases.translation,
    ease_factor:     phrases.ease_factor,
    repetitions:     phrases.repetitions,
  }).from(phrases).limit(5)

  console.log('\n=== SAMPLE PHRASES (5) ===')
  console.table(samplePhrases)

  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
