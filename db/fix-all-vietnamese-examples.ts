/**
 * fix-all-vietnamese-examples.ts
 * Fix cases where BOTH example1 AND example1_translation are Vietnamese
 * (previous script only handled the swap case, not the all-VI case)
 * 
 * Run: npx tsx db/fix-all-vietnamese-examples.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

function isVietnamese(s: string): boolean {
  return /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i.test(s)
}

async function main() {
  const { phrases } = await import('./schema.js')
  const { isNotNull, isNull } = await import('drizzle-orm')
  const postgres = (await import('postgres')).default
  const { drizzle } = await import('drizzle-orm/postgres-js')
  const { sql } = await import('drizzle-orm')

  const client = postgres(process.env.DATABASE_URL!, { max: 1, idle_timeout: 30 })
  const db = drizzle(client)

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

  // Categorize
  const bothVi: typeof rows = []     // cả 2 đều là VI → cần regenerate
  const alreadyOk: typeof rows = []  // OK

  for (const row of rows) {
    const e1 = row.example1 ?? ''
    const v1 = row.example1_translation ?? ''
    if (isVietnamese(e1) && isVietnamese(v1)) {
      bothVi.push(row)
    } else {
      alreadyOk.push(row)
    }
  }

  console.log(`\n📋 Breakdown:`)
  console.log(`   ✅ Already correct (EN example): ${alreadyOk.length}`)
  console.log(`   ❌ Both Vietnamese (need fix):   ${bothVi.length}`)

  if (bothVi.length > 0) {
    console.log(`\n🔍 Sample bad records:`)
    bothVi.slice(0, 5).forEach(r => {
      console.log(`   [${r.id}] "${r.sample_sentence}"`)
      console.log(`         ex1: ${r.example1?.slice(0, 60)}`)
      console.log(`         tr1: ${r.example1_translation?.slice(0, 60)}`)
    })

    console.log(`\n🗑️  Clearing bad examples so AI Auto-fill can regenerate...`)
    const { eq, inArray } = await import('drizzle-orm')
    const badIds = bothVi.map(r => r.id)

    // Clear in batches of 100
    for (let i = 0; i < badIds.length; i += 100) {
      const batch = badIds.slice(i, i + 100)
      await db.update(phrases).set({
        example1: null,
        example1_pronunciation: null,
        example1_translation: null,
        example2: null,
        example2_pronunciation: null,
        example2_translation: null,
      }).where(inArray(phrases.id, batch))
      process.stdout.write(`\r   Cleared ${Math.min(i + 100, badIds.length)}/${badIds.length}...`)
    }
    console.log(`\n✅ Cleared ${badIds.length} bad records. Run fill-examples.ts to regenerate.`)
  } else {
    console.log(`\n🎉 No bad records found!`)
  }

  await client.end()
  process.exit(0)
}

main().catch(e => { console.error('❌', e); process.exit(1) })
