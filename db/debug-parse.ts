/**
 * debug-parse.ts — Debug crawler để xem Langmaster trả HTML như thế nào
 * npx tsx db/debug-parse.ts
 */
import { config } from 'dotenv'
import { writeFileSync } from 'fs'
config({ path: '.env.local' })

const URL = 'https://langmaster.edu.vn/tieng-anh-giao-tiep-co-ban-co-phu-de-bai-19-tai-ngan-hang'

async function main() {
  console.log('Fetching:', URL)
  const res = await fetch(URL, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    }
  })

  const html = await res.text()
  console.log('Status:', res.status, '| Length:', html.length)

  // Check if phrases are in the HTML
  const testPhrase = 'want to set up'
  const idx = html.indexOf(testPhrase)
  console.log(`\nPhrase "${testPhrase}" found at index:`, idx)

  if (idx >= 0) {
    // Show surrounding context
    console.log('\n--- Context around phrase ---')
    console.log(html.slice(Math.max(0, idx - 300), idx + 500))
  } else {
    console.log('\n⚠️  Phrase NOT found in HTML — page may be JS-rendered')
    // Check if there's JSON with content
    const jsonIdx = html.indexOf('"want to set up"')
    console.log('JSON variant found at:', jsonIdx)

    // Save first 5000 chars of HTML for inspection
    console.log('\n--- First 3000 chars of HTML ---')
    console.log(html.slice(0, 3000))
  }

  // Save full HTML for manual inspection
  writeFileSync('db/debug-page.html', html)
  console.log('\n✅ Full HTML saved to db/debug-page.html')
}

main().catch(console.error)
