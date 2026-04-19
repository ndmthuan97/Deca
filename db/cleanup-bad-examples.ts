/**
 * cleanup-bad-examples.ts — Xóa examples bị trùng lặp hoặc trùng với sample_sentence
 * 
 * Cách chạy: npx tsx db/cleanup-bad-examples.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

function normalize(s: string) {
  return s.trim().toLowerCase().replace(/[?!.,;:'"]/g, '').replace(/\s+/g, ' ')
}

async function main() {
  const { phrases } = await import('./schema.js')
  const { isNotNull, eq, sql } = await import('drizzle-orm')
  const postgres = (await import('postgres')).default
  const { drizzle } = await import('drizzle-orm/postgres-js')

  const client = postgres(process.env.DATABASE_URL!, { max: 1, idle_timeout: 30 })
  const db = drizzle(client)

  const rows = await db
    .select({
      id: phrases.id,
      sample_sentence: phrases.sample_sentence,
      example1: phrases.example1,
      example2: phrases.example2,
    })
    .from(phrases)
    .where(isNotNull(phrases.example1))

  console.log(`📊 Checking ${rows.length} phrases with examples...`)

  let cleared = 0

  for (const row of rows) {
    const sample = normalize(row.sample_sentence)
    const e1     = normalize(row.example1 ?? '')
    const e2     = normalize(row.example2 ?? '')

    // Bad nếu: e1 trùng sample, e1 trùng e2, hoặc e2 trùng sample
    const bad = e1 === sample || (e2 && e1 === e2) || (e2 && e2 === sample)
    if (!bad) continue

    // NULL ra để fill-examples.ts regenerate
    await db.update(phrases).set({
      example1: null,
      example1_translation: null,
      example1_pronunciation: null,
      example2: null,
      example2_translation: null,
      example2_pronunciation: null,
    }).where(eq(phrases.id, row.id))

    cleared++
    if (cleared % 20 === 0) process.stdout.write(`\r🗑  Cleared ${cleared}...`)
  }

  console.log(`\n\n✅ Done!`)
  console.log(`   Cleared bad examples: ${cleared}`)
  console.log(`   Clean (untouched):    ${rows.length - cleared}`)
  console.log(`\n👉 Chạy tiếp: npx tsx db/fill-examples.ts để regenerate`)

  await client.end()
  process.exit(0)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
