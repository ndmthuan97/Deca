/**
 * cleanup-vietnamese-examples.ts — Xóa examples có text tiếng Việt trong field tiếng Anh
 *
 * Phát hiện: Nếu example1 chứa nhiều ký tự có dấu tiếng Việt (ắ, ấ, ề, ồ, ơ, ư...)
 * → là tiếng Việt bị swap → clear để regenerate
 *
 * Cách chạy: npx tsx db/cleanup-vietnamese-examples.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

// Regex phát hiện ký tự có dấu tiếng Việt điển hình
const VI_CHARS = /[àáâãèéêìíòóôõùúăđĩũơưạảấầẩẫậắằẳẵặẹẻẽếềểễệỉịọỏốồổỗộớờởỡợụủứừửữựỳýỵỷỹ]/gi

function isVietnamese(text: string): boolean {
  const matches = text.match(VI_CHARS) ?? []
  // Ngưỡng: > 3 ký tự có dấu → khả năng cao là tiếng Việt
  return matches.length > 3
}

async function main() {
  const { phrases } = await import('./schema.js')
  const { isNotNull, eq } = await import('drizzle-orm')
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

  console.log(`📊 Checking ${rows.length} phrases with examples for Vietnamese text...`)

  let cleared = 0

  for (const row of rows) {
    const e1 = row.example1 ?? ''
    const e2 = row.example2 ?? ''

    // Nếu example1 (tiếng Anh) chứa tiếng Việt → bị swap → clear
    const bad = isVietnamese(e1) || isVietnamese(e2)
    if (!bad) continue

    await db.update(phrases).set({
      example1: null,
      example1_translation: null,
      example1_pronunciation: null,
      example2: null,
      example2_translation: null,
      example2_pronunciation: null,
    }).where(eq(phrases.id, row.id))

    cleared++
    if (cleared % 20 === 0 || cleared <= 5) {
      process.stdout.write(`\r🗑  Cleared ${cleared} (last: "${e1.slice(0, 40)}")...`)
    }
  }

  console.log(`\n\n✅ Done!`)
  console.log(`   Cleared Vietnamese-in-English: ${cleared}`)
  console.log(`   Untouched:                     ${rows.length - cleared}`)
  console.log(`\n👉 Chạy tiếp fill-examples.ts để regenerate (nếu fill chưa chạy)`)

  await client.end()
  process.exit(0)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
