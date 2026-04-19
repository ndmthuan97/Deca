import { readFileSync } from 'fs'

const html = readFileSync('db/debug-page.html', 'utf-8')
const VI_CHARS = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i
const BLOCK_RE = /langmaster|khóa học|đăng ký|trung tâm|starters|flyers|movers|kindergarten|nội dung hot|giảng viên|tìm hiểu thêm|clip/i

function stripInnerTags(s: string) {
  return s.replace(/<[^>]+>/g, ' ').replace(/&amp;/g, '&').replace(/&nbsp;/g, ' ')
    .replace(/&#\d+;/g, ' ').replace(/\s+/g, ' ').trim()
}

const dialogIdx = html.search(/<h[23][^>]*>[^<]*(?:hội thoại|Hội Thoại|đoạn hội thoại)[^<]*<\/h[23]>/i)
const contentHtml = (dialogIdx > 5000) ? html.slice(0, dialogIdx) : html
console.log('Dialog at idx:', dialogIdx, '| Content length:', contentHtml.length)

const liRe = /<li[^>]*>([\s\S]*?)<\/li>/gi
const results: { en: string; vi: string }[] = []
const seenKeys = new Set<string>()
let match: RegExpExecArray | null

while ((match = liRe.exec(contentHtml)) !== null) {
  const inner = match[1]
  let en = '', vi = ''
  const boldMatch = inner.match(/<(?:b|strong)[^>]*>([\s\S]*?)<\/(?:b|strong)>/i)
  if (boldMatch) en = stripInnerTags(boldMatch[1]).replace(/\.\s*$/, '').trim()
  const fullText = stripInnerTags(inner)
  const parenMatch = fullText.match(/\(([^()]{4,120})\)/)
  if (parenMatch) vi = parenMatch[1].trim()
  if (!en || !vi) continue
  if (VI_CHARS.test(en.charAt(0))) continue
  if (!VI_CHARS.test(vi)) continue
  if (BLOCK_RE.test(en) || BLOCK_RE.test(vi)) continue
  if (en.length < 3 || en.length > 140) continue
  const key = en.toLowerCase().replace(/[^a-z0-9' ]/g, '').trim()
  if (key.length < 4 || seenKeys.has(key)) continue
  seenKeys.add(key)
  results.push({ en, vi })
}

console.log('Total parsed:', results.length)
results.forEach(({ en, vi }) => console.log(` ✦ "${en}" → "${vi}"`))
