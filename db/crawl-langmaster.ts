/**
 * crawl-langmaster.ts — Crawl 52 bài Langmaster → DACE DB
 * npx tsx db/crawl-langmaster.ts --phase=1 --dry-run
 * npx tsx db/crawl-langmaster.ts --phase=1
 * npx tsx db/crawl-langmaster.ts --phase=2
 * npx tsx db/crawl-langmaster.ts --phase=3
 */
import { config } from 'dotenv'
config({ path: '.env.local' })

const DRY_RUN  = process.argv.includes('--dry-run')
const PHASE    = parseInt(process.argv.find(a => a.startsWith('--phase='))?.split('=')[1] ?? '1')
const DELAY_MS = 1500

/* ── 52 lessons ─────────────────────────────────────────── */
const LESSONS: Array<{
  num: number; slug: string; type: string
  topicId?: number
  topic?: { name: string; slug: string; icon: string; desc: string }
}> = [
  // Phase 1 — merge into existing topics
  { num:  1, slug: 'bai-1-greetings-chao-hoi',                             topicId: 11, type: 'Greeting' },
  { num:  2, slug: 'bai-2-meeting-%E2%80%93-gap-go-a72i1313.html',         topicId: 12, type: 'Greeting' },
  { num:  3, slug: 'bai-3-saying-goodbye-tam-biet',                         topicId: 14, type: 'Expressing' },
  { num:  4, slug: 'bai-4-introduction-gioi-thieu',                         topicId: 15, type: 'Introducing' },
  { num:  5, slug: 'bai-5-noi-chuyen-ve-thoi-tiet',                         topicId: 16, type: 'Asking' },
  { num:  6, slug: 'bai-6-thoi-gian-va-ngay-thang-a72i1317.html',          topicId: 17, type: 'Asking' },
  { num:  7, slug: 'bai-7-hoi-va-chi-duong',                                topicId: 18, type: 'Asking' },
  { num:  8, slug: 'bai-8-taxi',                                             topicId: 19, type: 'Requesting' },
  { num:  9, slug: 'bai-9-sports-the-thao',                                 topicId: 20, type: 'Asking' },
  { num: 10, slug: 'bai-10-shopping-mua-sam',                               topicId: 21, type: 'Requesting' },
  { num: 11, slug: 'bai-11-holiday-ngay-nghi',                              topicId: 22, type: 'Asking' },
  { num: 12, slug: 'bai-12-going-to-a-party-di-du-tiec',                   topicId: 23, type: 'Inviting' },
  { num: 13, slug: 'bai-13-back-from-vacation-sau-ky-nghi',                topicId: 24, type: 'Asking' },
  { num: 14, slug: 'bai-14-trong-nha-hang',                                 topicId: 25, type: 'Requesting' },
  { num: 15, slug: 'bai-15-dat-phong-khach-san',                            topicId: 26, type: 'Requesting' },
  { num: 16, slug: 'bai-16-trong-quan-ruou',                                topicId: 27, type: 'Requesting' },
  { num: 17, slug: 'bai-17-goi-dien-thoai',                                 topicId: 28, type: 'Asking' },
  { num: 18, slug: 'bai-18-yeu-cau-su-giup-do',                            topicId: 29, type: 'Requesting' },
  // Phase 2 — new topics
  { num: 19, slug: 'bai-19-tai-ngan-hang',       type: 'Requesting', topic: { name: 'Bank',                slug: 'bank',                icon: '🏦', desc: 'Giao dịch tại ngân hàng' } },
  { num: 20, slug: 'bai-20-tren-may-bay',        type: 'Requesting', topic: { name: 'Airplane',            slug: 'airplane',            icon: '✈️', desc: 'Giao tiếp trên máy bay' } },
  { num: 21, slug: 'bai-21-tai-buu-dien',        type: 'Requesting', topic: { name: 'Post Office',         slug: 'post-office',         icon: '📮', desc: 'Tại bưu điện' } },
  { num: 22, slug: 'bai-22-tai-san-bay',         type: 'Requesting', topic: { name: 'Airport',             slug: 'airport',             icon: '🛫', desc: 'Tại sân bay' } },
  { num: 23, slug: 'bai-23-so-thich',            type: 'Asking',     topic: { name: 'Hobbies',             slug: 'hobbies',             icon: '🎨', desc: 'Sở thích cá nhân' } },
  { num: 24, slug: 'bai-24-chuc-mung',           type: 'Expressing', topic: { name: 'Congratulations',     slug: 'congratulations',     icon: '🎉', desc: 'Lời chúc mừng' } },
  { num: 25, slug: 'bai-25-dua-ra-loi-khen-ngoi', type: 'Expressing', topic: { name: 'Compliments',        slug: 'compliments',         icon: '🌟', desc: 'Đưa ra lời khen' } },
  { num: 26, slug: 'bai-26-bi-om',               type: 'Expressing', topic: { name: 'Being Sick',          slug: 'being-sick',          icon: '🤒', desc: 'Khi bị ốm' } },
  { num: 27, slug: 'bai-27-dua-ra-loi-goi-y',   type: 'Suggesting', topic: { name: 'Making Suggestions',  slug: 'making-suggestions',  icon: '💡', desc: 'Đưa ra lời gợi ý' } },
  { num: 28, slug: 'bai-28-phan-nan',            type: 'Complaining', topic: { name: 'Complaints',         slug: 'complaints',          icon: '😤', desc: 'Phàn nàn' } },
  { num: 29, slug: 'bai-29-job-cong-viec',       type: 'Asking',     topic: { name: 'Job',                 slug: 'job',                 icon: '💼', desc: 'Công việc' } },
  { num: 30, slug: 'bai-30-cach-ung-xu',         type: 'Expressing', topic: { name: 'Behavior',            slug: 'behavior',            icon: '🤝', desc: 'Cách ứng xử' } },
  { num: 31, slug: 'bai-31-invitations-loi-moi', type: 'Inviting',   topic: { name: 'Invitations',         slug: 'invitations',         icon: '💌', desc: 'Lời mời' } },
  { num: 32, slug: 'bai-32-cam-on',              type: 'Expressing', topic: { name: 'Thank You',           slug: 'thank-you',           icon: '🙏', desc: 'Cảm ơn' } },
  { num: 33, slug: 'bai-33-truong-hoc',          type: 'Asking',     topic: { name: 'School',              slug: 'school',              icon: '🏫', desc: 'Trường học' } },
  { num: 34, slug: 'bai-34-thong-bao-tin-mung',  type: 'Expressing', topic: { name: 'Good News',          slug: 'good-news',           icon: '📰', desc: 'Thông báo tin mừng' } },
  { num: 35, slug: 'bai-35-noi-ve-hoat-dong-hang-ngay', type: 'Asking', topic: { name: 'Daily Activities', slug: 'daily-activities',    icon: '📅', desc: 'Hoạt động hàng ngày' } },
  // Phase 3
  { num: 36, slug: 'bai-36-tim-viec',            type: 'Asking',     topic: { name: 'Job Hunting',         slug: 'job-hunting',         icon: '🔍', desc: 'Tìm việc làm' } },
  { num: 37, slug: 'bai-37-family-gia-dinh',     type: 'Asking',     topic: { name: 'Family',              slug: 'family',              icon: '👨‍👩‍👧', desc: 'Gia đình' } },
  { num: 38, slug: 'bai-38-giao-duc',            type: 'Asking',     topic: { name: 'Education',           slug: 'education',           icon: '🎓', desc: 'Giáo dục' } },
  { num: 39, slug: 'bai-39-gap-bac-si',          type: 'Requesting', topic: { name: 'Doctor Visit',        slug: 'doctor-visit',        icon: '👨‍⚕️', desc: 'Gặp bác sĩ' } },
  { num: 40, slug: 'bai-40-tram-xe-bus',         type: 'Asking',     topic: { name: 'Bus Station',         slug: 'bus-station',         icon: '🚌', desc: 'Trạm xe bus' } },
  { num: 41, slug: 'bai-41-trong-quan-cafe-a72i1352.html', type: 'Requesting', topic: { name: 'Café', slug: 'cafe', icon: '☕', desc: 'Trong quán cafe' } },
  { num: 42, slug: 'bai-42-noi-loi-tam-biet',   type: 'Expressing', topic: { name: 'Farewell',             slug: 'farewell',            icon: '👋', desc: 'Nói lời tạm biệt' } },
  { num: 43, slug: 'bai-43-gap-go-tham-hoi',    type: 'Greeting',   topic: { name: 'Catching Up',          slug: 'catching-up',         icon: '🤗', desc: 'Gặp gỡ thăm hỏi' } },
  { num: 44, slug: 'bai-44-cach-de-bat-dau-cuoc-hoi-thoai', type: 'Greeting', topic: { name: 'Starting a Conversation', slug: 'starting-conversation', icon: '💬', desc: 'Bắt đầu cuộc hội thoại' } },
  { num: 45, slug: 'bai-45-cach-xung-ho',       type: 'Greeting',   topic: { name: 'Forms of Address',     slug: 'forms-of-address',    icon: '🎩', desc: 'Cách xưng hô' } },
  { num: 46, slug: 'bai-46-di-cho',             type: 'Requesting', topic: { name: 'Market',               slug: 'market',              icon: '🛒', desc: 'Đi chợ' } },
  { num: 47, slug: 'bai-47-tim-cac-chu-de-de-noi-chuyen', type: 'Asking', topic: { name: 'Conversation Topics', slug: 'conversation-topics', icon: '🗣️', desc: 'Tìm chủ đề nói chuyện' } },
  { num: 48, slug: 'bai-48-nhan-vien-moi',      type: 'Greeting',   topic: { name: 'New Employee',         slug: 'new-employee',        icon: '🆕', desc: 'Nhân viên mới' } },
  { num: 49, slug: 'bai-49-noi-loi-xin-loi-langmaster', type: 'Apologizing', topic: { name: 'Apology', slug: 'apology', icon: '🙇', desc: 'Nói lời xin lỗi' } },
  { num: 50, slug: 'bai-50-ke-hoach-cho-ngay-cuoi-tuan', type: 'Asking', topic: { name: 'Weekend Plans', slug: 'weekend-plans', icon: '📆', desc: 'Kế hoạch cuối tuần' } },
  { num: 51, slug: 'bai-51-di-cat-toc',         type: 'Requesting', topic: { name: 'Haircut',              slug: 'haircut',             icon: '💇', desc: 'Đi cắt tóc' } },
  { num: 52, slug: 'bai-52-excuses-xin-loi-langmaster', type: 'Apologizing', topic: { name: 'Excuses', slug: 'excuses', icon: '😅', desc: 'Đưa ra lý do, xin lỗi' } },
]

/* ── Constants ──────────────────────────────────────────── */
const BASE     = 'https://langmaster.edu.vn/tieng-anh-giao-tiep-co-ban-co-phu-de-'
const sleep    = (ms: number) => new Promise(r => setTimeout(r, ms))
const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
const BLOCK_RE = /langmaster|khóa học|đăng ký|trung tâm|học viên|starters|flyers|movers|kindergarten|nội dung hot|giảng viên|tìm hiểu thêm|xem thêm|tìm hiểu|clip/i

/* ── Fetch ──────────────────────────────────────────────── */
async function fetchPage(url: string): Promise<string> {
  const r = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      'Accept': 'text/html,application/xhtml+xml',
      'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
    }
  })
  return r.text()
}

/* ── Parser ─────────────────────────────────────────────── */
function stripInnerTags(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&nbsp;/g, ' ').replace(/&#\d+;/g, '').replace(/&[a-z]+;/g, ' ')
    .replace(/\s+/g, ' ').trim()
}

/**
 * Langmaster phrase HTML structure (discovered via debug):
 *   <li style="..."><b>English phrase.</b><span style="...">(Vietnamese meaning.)</span></li>
 *
 * Parse strategy:
 * 1. Cut HTML at first dialogue section header
 * 2. For each <li>, extract <b>/<strong> = English, <span>/<em>/(parens in text) = Vietnamese
 * 3. Validate & dedup
 */
function parsePhrases(html: string): { en: string; vi: string }[] {
  const results: { en: string; vi: string }[] = []
  const seenKeys = new Set<string>()

  // ── Cut at dialogue section ──────────────────────────────
  // Dialogue h2/h3 typically: "2. Những đoạn hội thoại..."
  const dialogIdx = html.search(/<h[23][^>]*>[^<]*(?:hội thoại|Hội Thoại|đoạn hội thoại)[^<]*<\/h[23]>/i)
  const contentHtml = (dialogIdx > 5000) ? html.slice(0, dialogIdx) : html

  // ── Extract all <li> blocks ──────────────────────────────
  const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
  let match: RegExpExecArray | null

  while ((match = liRe.exec(contentHtml)) !== null) {
    const inner = match[1]
    let en = ''
    let vi = ''

    // Method A: <b>English</b>...<span>(Vietnamese)</span>
    const boldMatch = inner.match(/<(?:b|strong)[^>]*>([\s\S]*?)<\/(?:b|strong)>/i)
    if (boldMatch) {
      en = stripInnerTags(boldMatch[1]).replace(/\.\s*$/, '').trim()
    }

    // Vietnamese: look for parens in the full stripped text
    const fullText = stripInnerTags(inner)
    const parenMatch = fullText.match(/\(([^()]{4,120})\)/)
    if (parenMatch) {
      vi = parenMatch[1].trim()
    }

    // Method B: no bold tag — parse as plain "English (Vietnamese)"
    if (!en || !vi) {
      const plainMatch = fullText.match(/^[-•]?\s*([A-Z][^()]{3,120}?)\s+\(([^()]{4,120})\)\s*\.?\s*$/)
      if (plainMatch) {
        en = plainMatch[1].trim()
        vi = plainMatch[2].trim()
      }
    }

    if (!en || !vi) continue

    // ── Validate ─────────────────────────────────────────
    en = en.replace(/\.\s*$/, '').trim()

    // English must start with ASCII letter (not Vietnamese)
    if (VI_CHARS.test(en.charAt(0))) continue
    // Must have at least some Vietnamese chars in translation
    if (!VI_CHARS.test(vi)) continue
    // Blocklist
    if (BLOCK_RE.test(en) || BLOCK_RE.test(vi)) continue
    // Length guards
    if (en.length < 3 || en.length > 140) continue
    // Handle "A hoặc B" alternatives — keep first
    if (en.includes(' hoặc ')) en = en.split(' hoặc ')[0].trim()

    const key = en.toLowerCase().replace(/[^a-z0-9' ]/g, '').trim()
    if (key.length < 4 || seenKeys.has(key)) continue
    seenKeys.add(key)

    results.push({ en, vi })
  }

  return results
}

/* ── Structural fingerprint for dedup ─────────────────────── */
function fingerprint(s: string): string {
  return s.toLowerCase()
    .replace(/[^a-z0-9 ']/g, ' ')
    .split(/\s+/).filter(w => w.length > 1)
    .slice(0, 3).join(' ')
}

/* ── Main ───────────────────────────────────────────────── */
async function main() {
  const { db }     = await import('./index.js')
  const { topics, phrases } = await import('./schema.js')
  const { eq }     = await import('drizzle-orm')

  const phaseRanges: Record<number, [number, number]> = {
    1: [1, 18], 2: [19, 35], 3: [36, 52],
  }
  const [from, to] = phaseRanges[PHASE] ?? [1, 18]
  const batch = LESSONS.filter(l => l.num >= from && l.num <= to)

  console.log(`\n🚀 Phase ${PHASE} | Bài ${from}–${to} | ${batch.length} lessons | DRY_RUN=${DRY_RUN}\n`)

  let totalInserted = 0, totalSkipped = 0

  for (const lesson of batch) {
    const url = BASE + lesson.slug
    console.log(`\n📖 Bài ${lesson.num}: ${lesson.slug.slice(4, 50)}`)

    // ── 1. Resolve topic ID ──────────────────────────────
    let topicId = lesson.topicId

    if (!topicId && lesson.topic) {
      const t = lesson.topic
      if (DRY_RUN) {
        topicId = -(lesson.num)
        console.log(`   [DRY] Sẽ tạo topic: "${t.name}"`)
      } else {
        const rows = await db.select({ id: topics.id }).from(topics).where(eq(topics.slug, t.slug))
        if (rows.length > 0) {
          topicId = rows[0].id
          console.log(`   ↻ Topic tồn tại id=${topicId}: ${t.name}`)
        } else {
          const ins = await db.insert(topics).values({
            name: t.name, slug: t.slug, icon: t.icon,
            description: t.desc, order_index: lesson.num,
          }).returning({ id: topics.id })
          topicId = ins[0].id
          console.log(`   ✅ Tạo topic mới id=${topicId}: ${t.name}`)
        }
      }
    }

    // ── 2. Load existing phrase fingerprints ────────────
    const existingFps = new Set<string>()
    if (!DRY_RUN && topicId && topicId > 0) {
      const ex = await db.select({ sample_sentence: phrases.sample_sentence })
        .from(phrases).where(eq(phrases.topic_id, topicId))
      ex.forEach(p => p.sample_sentence && existingFps.add(fingerprint(p.sample_sentence)))
      console.log(`   Existing: ${ex.length} phrases`)
    }

    // ── 3. Fetch & parse ─────────────────────────────────
    await sleep(DELAY_MS)
    let html: string
    try { html = await fetchPage(url) }
    catch (e) { console.error(`   ❌ Fetch lỗi: ${e}`); continue }

    const parsed = parsePhrases(html)
    console.log(`   Parsed: ${parsed.length} candidates`)

    // ── 4. Structural dedup ───────────────────────────────
    const batchFps = new Set<string>()
    const toInsert: { en: string; vi: string }[] = []

    for (const { en, vi } of parsed) {
      const fp = fingerprint(en)
      if (existingFps.has(fp) || batchFps.has(fp)) { totalSkipped++; continue }
      batchFps.add(fp)
      toInsert.push({ en, vi })
    }

    console.log(`   Sẽ insert: ${toInsert.length} | Bỏ qua (trùng): ${parsed.length - toInsert.length}`)

    // ── 5. Insert / preview ───────────────────────────────
    if (DRY_RUN) {
      toInsert.slice(0, 6).forEach(({ en, vi }) => console.log(`     ✦ "${en}" → "${vi}"`))
      if (toInsert.length > 6) console.log(`     ... và ${toInsert.length - 6} câu khác`)
    } else if (topicId && toInsert.length > 0) {
      const rows = toInsert.map(({ en, vi }) => ({
        topic_id: topicId!,
        type: lesson.type,
        sample_sentence: en,
        translation: vi,
        function: `Mẫu câu giao tiếp – Bài ${lesson.num}`,
      }))
      await db.insert(phrases).values(rows)
      totalInserted += rows.length
      console.log(`   ✅ Đã insert ${rows.length} phrases`)
    }
  }

  console.log(`\n━━━ Phase ${PHASE} hoàn tất ━━━`)
  console.log(`Inserted: ${totalInserted}  |  Skipped (dup): ${totalSkipped}`)
  process.exit(0)
}

main().catch(e => { console.error(e); process.exit(1) })
