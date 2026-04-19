import { db } from '@/db'
import { phrases, topics } from '@/db/schema'
import { and, isNull, eq, ne, sql } from 'drizzle-orm'
import { ok, badRequest, serverError } from '@/lib/api-response'

export type QuizMode = 'multiple_choice' | 'fill_blank' | 'listening' | 'translation' | 'dictation'

export interface QuizQuestion {
  mode:           QuizMode
  phraseId:       number
  topicId:        number | null
  topicName:      string
  // Dữ liệu câu hỏi
  sentence:       string          // câu tiếng Anh
  translation:    string          // bản dịch
  pronunciation:  string | null
  // Dạng multiple_choice
  options?:       string[]        // 4 lựa chọn (bao gồm đáp án đúng)
  correctIndex?:  number          // index của đáp án đúng trong options
  // Dạng fill_blank
  blankedSentence?: string        // "I ___ you tomorrow"
  blankWord?:       string        // "see" (đáp án điền vào chỗ trống)
}

const MODES: QuizMode[] = ['multiple_choice', 'fill_blank', 'listening', 'translation', 'dictation']

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/**
 * Tạo câu fill-in-the-blank từ một câu tiếng Anh.
 * Chọn ngẫu nhiên 1 từ có độ dài >= 4 để che đi.
 */
function makeFillBlank(sentence: string): { blanked: string; word: string } | null {
  const words = sentence.split(' ')
  const candidates = words
    .map((w, i) => ({ w: w.replace(/[^a-zA-Z']/g, ''), i }))
    .filter(({ w }) => w.length >= 4)

  if (candidates.length === 0) return null

  const { w: word, i: idx } = candidates[Math.floor(Math.random() * candidates.length)]
  const blanked = words
    .map((w, i) => (i === idx ? '___' : w))
    .join(' ')

  return { blanked, word }
}

/**
 * GET /api/quiz?topic_id=3&limit=10&mode=random
 * Trả về danh sách câu hỏi quiz cho một session.
 * mode: 'random' | 'multiple_choice' | 'fill_blank' | 'listening' | 'translation'
 */
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const topicId = searchParams.get('topic_id')
  const limit   = Math.min(parseInt(searchParams.get('limit') ?? '10', 10), 50)
  const modeParam = searchParams.get('mode') ?? 'random'

  if (!topicId) return badRequest('topic_id is required')

  const topicIdNum = parseInt(topicId, 10)
  if (isNaN(topicIdNum)) return badRequest('topic_id must be a number')

  try {
    // Lấy phrases của topic (ngẫu nhiên)
    const pool = await db
      .select({
        id:              phrases.id,
        topic_id:        phrases.topic_id,
        sample_sentence: phrases.sample_sentence,
        translation:     phrases.translation,
        pronunciation:   phrases.pronunciation,
        type:            phrases.type,
      })
      .from(phrases)
      .where(and(eq(phrases.topic_id, topicIdNum), isNull(phrases.deleted_at)))
      .orderBy(sql`RANDOM()`)
      .limit(limit + 10) // lấy thêm để có distractors

    if (pool.length < 2) {
      return badRequest('Not enough phrases in this topic (need at least 2)')
    }

    const topic = await db
      .select({ name: topics.name })
      .from(topics)
      .where(eq(topics.id, topicIdNum))
      .limit(1)

    const topicName = topic[0]?.name ?? 'Unknown Topic'

    // Tạo câu hỏi
    const questions: QuizQuestion[] = []
    const questionPhrases = pool.slice(0, limit)
    const distractors     = pool.slice(limit) // dùng cho multiple choice

    for (let qi = 0; qi < questionPhrases.length; qi++) {
      const p = questionPhrases[qi]

      // Chọn mode
      let mode: QuizMode
      if (modeParam === 'random') {
        mode = MODES[qi % MODES.length]
      } else if (MODES.includes(modeParam as QuizMode)) {
        mode = modeParam as QuizMode
      } else {
        mode = 'multiple_choice'
      }

      const base: Omit<QuizQuestion, 'mode' | 'options' | 'correctIndex' | 'blankedSentence' | 'blankWord'> = {
        phraseId:      p.id,
        topicId:       p.topic_id,
        topicName,
        sentence:      p.sample_sentence,
        translation:   p.translation ?? '',
        pronunciation: p.pronunciation ?? null,
      }

      if (mode === 'multiple_choice' || mode === 'listening') {
        // Đáp án: translation đúng + 3 distractor translations
        const wrongPool = [
          ...distractors,
          ...questionPhrases.filter((_, i) => i !== qi),
        ]
          .filter(d => d.translation && d.translation !== p.translation)
          .slice(0, 3)
          .map(d => d.translation!)

        // Nếu không đủ 3 distractor, skip về translation mode
        if (wrongPool.length < 3) {
          questions.push({ ...base, mode: 'translation' })
          continue
        }

        const allOptions = shuffle([p.translation!, ...wrongPool])
        questions.push({
          ...base,
          mode,
          options:      allOptions,
          correctIndex: allOptions.indexOf(p.translation!),
        })
      } else if (mode === 'fill_blank') {
        const fb = makeFillBlank(p.sample_sentence)
        if (!fb) {
          questions.push({ ...base, mode: 'translation' })
          continue
        }
        questions.push({
          ...base,
          mode,
          blankedSentence: fb.blanked,
          blankWord:       fb.word,
        })
      } else if (mode === 'dictation') {
        // Dictation: just needs the sentence — client handles TTS + word scoring
        questions.push({ ...base, mode: 'dictation' })
      } else {
        // translation mode
        questions.push({ ...base, mode: 'translation' })
      }
    }

    return ok({ questions, total: questions.length, topicName })
  } catch (err) {
    console.error('[GET /api/quiz]', err)
    return serverError('Failed to generate quiz')
  }
}
