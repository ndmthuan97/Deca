/**
 * fix-translations.ts — Batch fix translation & function không tự nhiên/sai nghĩa
 * Chạy: npx tsx db/fix-translations.ts
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const fixes: { id: number; translation?: string; function?: string }[] = [

  // ══ GREETINGS (topic 11) ══════════════════════════════════════════
  // "Cô ấy hỏi chuyện mới..." → câu hỏi casual
  { id: 254, translation: 'Có gì mới không?' },
  // "Hôm nay gặp lại bạn" → không rõ cảm xúc
  { id: 256, translation: 'Vui được gặp lại bạn' },
  // "Ai là bạn?" → sai ngữ pháp tiếng Việt
  { id: 260, translation: 'Bạn là ai vậy?' },
  // "Người nói hỏi nghĩa..." → dịch như mô tả, không phải translation
  { id: 261, translation: 'Từ này có nghĩa là gì?', function: 'Hỏi nghĩa của một từ khi không hiểu.' },
  // "Người nói hỏi người nghe về nguồn gốc..." → mô tả, không phải dịch
  { id: 262, translation: 'Bạn từ đâu đến vậy?', function: 'Hỏi nơi xuất phát hoặc nguồn gốc của người nghe.' },
  // "Người nói muốn biết tên..." → mô tả, không phải dịch
  { id: 263, translation: 'Cái này gọi là gì trong tiếng Anh?', function: 'Hỏi tên gọi tiếng Anh của một vật hoặc khái niệm.' },

  // ══ MEETING (topic 12) ════════════════════════════════════════════
  // "Bạn làm thế nào?" → sai hoàn toàn (How do you do = lời chào trang trọng)
  { id: 291, translation: 'Rất hân hạnh được gặp bạn', function: 'Lời chào trang trọng khi gặp mặt lần đầu.' },
  // "Hôm nay của bạn thế nào?" → example dịch sai (How long... ≠ hôm nay)
  { id: 293, function: 'Hỏi thời gian người nghe đã ở một nơi nào đó.' },
  // "Bao nhiêu?" → quá mơ hồ, "How far?" = Xa bao nhiêu?
  { id: 294, translation: 'Xa bao nhiêu?' },
  // "Cảm ơn và bạn?" → thiếu ngữ cảnh, quá cụt
  { id: 297, translation: 'Tôi rất khỏe, cảm ơn. Còn bạn thì sao?' },
  // "Chào sớm!" → sai (See you soon = Hẹn gặp lại sớm)
  { id: 304, translation: 'Hẹn gặp lại sớm nhé!' },

  // ══ SAYING GOODBYE (topic 14) ═════════════════════════════════════
  // "Tôi sợ phải đi ngay" → "I'm afraid" = lịch sự/tiếc nuối, không phải "sợ"
  { id: 313, translation: 'Xin lỗi, tôi phải đi ngay bây giờ rồi', function: 'Kết thúc cuộc trò chuyện một cách lịch sự khi cần rời đi.' },
  // "Hãy chào hỏi cho tôi" → thiếu rõ ràng về đối tượng
  { id: 318, translation: 'Hãy chuyển lời chào của tôi đến John nhé' },

  // ══ INTRODUCTION (topic 15) ═══════════════════════════════════════
  // "Người nói muốn được biết đến..." → mô tả, không phải dịch câu
  { id: 323, translation: 'Rất vui được làm quen với bạn.', function: 'Lời chào lịch sự khi gặp người mới lần đầu.' },
  // "Người nói đã thấy tốt khi gặp lại bạn." → lối dịch máy móc
  { id: 328, translation: 'Rất vui khi gặp lại bạn.', function: 'Thể hiện sự vui mừng khi gặp lại người quen sau một thời gian.' },
  // "Fancy gặp lại bạn ở đây" → giữ nguyên từ Fancy (không dịch)
  { id: 330, translation: 'Thật bất ngờ khi gặp bạn ở đây, Hoa!' },
  // "Một sự bất ngờ!" → dịch cứng, thiếu cảm thán
  { id: 331, translation: 'Thật bất ngờ quá!', function: 'Bày tỏ sự ngạc nhiên trước một điều bất ngờ.' },
  // "Tôi đã gặp rất nhiều về bạn..." → sai nghĩa (I've met ≠ I've heard)
  { id: 339, function: 'Khi người nói đã nghe nhiều về người nghe qua người thứ ba.' },
  // "Lan Anh, tôi là Tuan, một người bạn thân của tôi" → sai (a close friend of mine)
  { id: 336, translation: 'Lan Anh, đây là Tuan, một người bạn thân của tôi.' },
]

async function main() {
  const { db }      = await import('./index.js')
  const { phrases } = await import('./schema.js')
  const { eq }      = await import('drizzle-orm')

  let success = 0
  let failed  = 0

  console.log(`\n🔧 Bắt đầu fix ${fixes.length} records...\n`)

  for (const fix of fixes) {
    try {
      const updateData: Record<string, string> = {}
      if (fix.translation) updateData.translation = fix.translation
      if (fix.function)    updateData.function    = fix.function

      await db.update(phrases)
        .set(updateData)
        .where(eq(phrases.id, fix.id))

      const what = [fix.translation && `"${fix.translation}"`, fix.function && `[func updated]`].filter(Boolean).join(' ')
      console.log(`  ✅ id=${fix.id} → ${what}`)
      success++
    } catch (e) {
      console.error(`  ❌ id=${fix.id}`, e)
      failed++
    }
  }

  console.log(`\n📊 Kết quả: ${success} cập nhật thành công, ${failed} lỗi`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
