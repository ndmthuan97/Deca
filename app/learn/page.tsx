'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Loader2, Volume2, CheckCircle2, XCircle,
  ChevronRight, Trophy, RotateCcw, BookOpen, Brain, PenLine, Languages, Sparkles
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import { speak } from '@/lib/tts'
import type { QuizQuestion } from '@/app/api/quiz/route'

/* ─── Stage config ─────────────────────────────────────────────────────── */
// Each phrase goes through 4 stages: Introduce → Choice → Fill → Type
type Stage = 1 | 2 | 3 | 4

const STAGE_META: Record<Stage, { label: string; icon: React.ReactNode; color: string; hint: string }> = {
  1: { label: 'Giới thiệu',   icon: <BookOpen className="h-3.5 w-3.5" />, color: 'text-blue-500',    hint: 'Đọc và ghi nhớ câu này' },
  2: { label: 'Trắc nghiệm',  icon: <Brain className="h-3.5 w-3.5" />,    color: 'text-violet-500',  hint: 'Chọn bản dịch đúng' },
  3: { label: 'Điền chỗ trống', icon: <PenLine className="h-3.5 w-3.5" />, color: 'text-emerald-500', hint: 'Điền từ còn thiếu' },
  4: { label: 'Dịch câu',     icon: <Languages className="h-3.5 w-3.5" />, color: 'text-[#666]',      hint: 'Gõ câu tiếng Anh' },
}

interface LearnPhrase extends QuizQuestion {
  stage: Stage
  passed: boolean
}


function makeFillBlank(sentence: string): { blanked: string; word: string } | null {
  const words = sentence.split(' ')
  const candidates = words
    .map((w, i) => ({ w: w.replace(/[^a-zA-Z']/g, ''), i }))
    .filter(({ w }) => w.length >= 4)
  if (candidates.length === 0) return null
  const { w: word, i: idx } = candidates[Math.floor(Math.random() * candidates.length)]
  const blanked = words.map((w, i) => (i === idx ? '___' : w)).join(' ')
  return { blanked, word }
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

/* ─── Session Complete ────────────────────────────────────────────────── */
function LearnComplete({ total, onRetry, onBack }: { total: number; onRetry: () => void; onBack: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-4 text-5xl">🎓</div>
      <h2 className="text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5] mb-1">
        Học xong {total} câu!
      </h2>
      <p className="text-[14px] text-[#666] mb-8">
        Bạn đã hoàn thành đầy đủ 4 giai đoạn học cho tất cả các câu.
      </p>
      <div className="flex gap-3">
        <button onClick={onRetry}
          className="flex items-center gap-2 rounded-[8px] px-4 py-2 text-[13px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
          style={{ boxShadow: 'var(--shadow-border)' }}>
          <RotateCcw className="h-3.5 w-3.5" /> Học lại
        </button>
        <button onClick={onBack}
          className="flex items-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] px-5 py-2 text-[13px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
          Xong <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  )
}

/* ─── Stage 1: Introduce ─────────────────────────────────────────────── */
function StageIntroduce({ item, onNext }: { item: LearnPhrase; onNext: () => void }) {
  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] px-6 py-8 text-center"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-4">Câu tiếng Anh</p>
        <div className="flex items-center justify-center gap-3 mb-3">
          <h2 className="text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5] leading-snug">
            {item.sentence}
          </h2>
          <button onClick={() => speak(item.sentence)}
            className="shrink-0 rounded-[6px] p-2 text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors"
            style={{ boxShadow: 'var(--shadow-border)' }}>
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
        {item.pronunciation && (
          <p className="font-mono text-[13px] text-[#999] mb-4">{item.pronunciation}</p>
        )}
        <div className="border-t border-[#f0f0f0] dark:border-[#2a2a2a] pt-4 mt-2">
          <p className="text-[11px] uppercase tracking-widest text-[#999] mb-1">Nghĩa</p>
          <p className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5]">{item.translation}</p>
        </div>
      </div>
      <button onClick={onNext}
        className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] py-3 text-[14px] font-semibold text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
        Đã nhớ, tiếp theo <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─── Stage 2: Multiple Choice ────────────────────────────────────────── */
function StageChoice({ item, distractors, onResult }: {
  item: LearnPhrase
  distractors: string[]
  onResult: (correct: boolean) => void
}) {
  const [options] = useState(() => shuffle([item.translation, ...distractors.slice(0, 3)]))
  const [selected, setSelected] = useState<string | null>(null)

  function pick(opt: string) {
    if (selected) return
    setSelected(opt)
    const correct = opt === item.translation
    setTimeout(() => onResult(correct), 900)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] px-6 py-6"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-3">Nghĩa của câu này là gì?</p>
        <div className="flex items-center gap-3">
          <h2 className="text-[18px] font-bold text-[#171717] dark:text-[#f5f5f5]">{item.sentence}</h2>
          <button onClick={() => speak(item.sentence)}
            className="shrink-0 text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors">
            <Volume2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-2">
        {options.map((opt, i) => {
          const isCorrect = opt === item.translation
          const isSelected = selected === opt
          return (
            <button key={i} onClick={() => pick(opt)}
              className={cn(
                'w-full rounded-[8px] px-4 py-3 text-left text-[14px] font-medium transition-all',
                !selected && 'text-[#444] dark:text-[#ccc] hover:text-[#171717] dark:hover:text-[#f5f5f5]',
                selected && isCorrect && 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400',
                selected && isSelected && !isCorrect && 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400',
                selected && !isSelected && !isCorrect && 'opacity-40',
              )}
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <span className="mr-3 font-mono text-[11px] opacity-50">{String.fromCharCode(65 + i)}</span>
              {opt}
              {selected && isCorrect && <CheckCircle2 className="inline ml-2 h-4 w-4 text-emerald-500" />}
              {selected && isSelected && !isCorrect && <XCircle className="inline ml-2 h-4 w-4 text-red-500" />}
            </button>
          )
        })}
      </div>
    </div>
  )
}

/* ─── Stage 3: Fill Blank ─────────────────────────────────────────────── */
function StageFill({ item, onResult }: { item: LearnPhrase; onResult: (correct: boolean) => void }) {
  const fb = makeFillBlank(item.sentence)
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)

  if (!fb) {
    // Fallback: treat as introduce and auto-pass
    return (
      <div className="space-y-4">
        <StageIntroduce item={item} onNext={() => onResult(true)} />
      </div>
    )
  }

  function submit() {
    if (submitted) { onResult(correct); return }
    const ok = answer.trim().toLowerCase() === fb!.word.toLowerCase()
    setCorrect(ok)
    setSubmitted(true)
    if (!ok) speak(item.sentence)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] px-6 py-6 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Điền từ còn thiếu</p>
        <p className="text-[13px] text-[#666]">Nghĩa: <strong className="text-[#171717] dark:text-[#f5f5f5]">{item.translation}</strong></p>
        <p className="text-[17px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed break-words">
          {fb.blanked.split('___').map((part, i, arr) => (
            <span key={i}>
              {part}
              {i < arr.length - 1 && (
                submitted
                  ? <span className={cn('px-2 py-0.5 rounded mx-1', correct ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400' : 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400')}>{fb.word}</span>
                  : <input
                      autoFocus
                      value={answer}
                      onChange={e => setAnswer(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && submit()}
                      className="mx-1 inline-block w-28 rounded-[4px] border-b-2 border-[#171717] dark:border-[#f5f5f5] bg-transparent text-center text-[17px] font-semibold outline-none focus:border-blue-500"
                    />
              )}
            </span>
          ))}
        </p>
        {submitted && !correct && (
          <p className="text-[12px] text-red-500">Đáp án đúng: <strong>{fb.word}</strong></p>
        )}
      </div>
      <button onClick={submit}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-[8px] py-3 text-[14px] font-semibold transition-all',
          submitted
            ? correct
              ? 'bg-emerald-500 text-white hover:bg-emerald-600'
              : 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90'
        )}>
        {submitted ? (correct ? '✓ Tiếp theo' : '→ Thử lại sau') : 'Kiểm tra'}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─── Stage 4: Translation (type full sentence) ─────────────────────── */
function StageType({ item, onResult }: { item: LearnPhrase; onResult: (correct: boolean) => void }) {
  const [answer, setAnswer] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [correct, setCorrect] = useState(false)

  function normalize(s: string) {
    return s.trim().toLowerCase().replace(/[?!.,;:'"]/g, '').replace(/\s+/g, ' ')
  }

  function submit() {
    if (submitted) { onResult(correct); return }
    const ok = normalize(answer) === normalize(item.sentence)
    setCorrect(ok)
    setSubmitted(true)
    if (!ok) speak(item.sentence)
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] px-6 py-6 space-y-4"
        style={{ boxShadow: 'var(--shadow-card)' }}>
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#999]">Dịch sang tiếng Anh</p>
        <div className="flex items-center justify-between">
          <p className="text-[17px] font-semibold text-[#171717] dark:text-[#f5f5f5]">{item.translation}</p>
          <button onClick={() => speak(item.sentence)}
            className="shrink-0 text-[#bbb] hover:text-[#666] transition-colors p-1">
            <Volume2 className="h-4 w-4" />
          </button>
        </div>
        <textarea
          autoFocus
          rows={2}
          value={answer}
          onChange={e => setAnswer(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submit() } }}
          placeholder="Gõ câu tiếng Anh..."
          disabled={submitted}
          className="w-full rounded-[6px] bg-[#fafafa] dark:bg-[#222] px-3 py-2 text-[14px] text-[#171717] dark:text-[#f5f5f5] outline-none resize-none placeholder:text-[#bbb]"
          style={{ boxShadow: 'var(--shadow-border)' }}
        />
        {submitted && (
          <div className={cn('rounded-[6px] px-3 py-2 text-[13px]',
            correct ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
                    : 'bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400')}>
            {correct ? '✓ Chính xác!' : `Đáp án: ${item.sentence}`}
          </div>
        )}
      </div>
      <button onClick={submit}
        className={cn(
          'w-full flex items-center justify-center gap-2 rounded-[8px] py-3 text-[14px] font-semibold transition-all',
          submitted
            ? correct ? 'bg-emerald-500 text-white hover:bg-emerald-600' : 'bg-red-500 text-white hover:bg-red-600'
            : 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90'
        )}>
        {submitted ? (correct ? '✓ Hoàn thành!' : '→ Tiếp theo') : 'Kiểm tra'}
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  )
}

/* ─── Main Learn Page ─────────────────────────────────────────────────── */
function LearnContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const topicId = searchParams.get('topic_id')

  const [items, setItems]       = useState<LearnPhrase[]>([])
  const [index, setIndex]       = useState(0)
  const [loading, setLoading]   = useState(true)
  const [finished, setFinished] = useState(false)
  const [topicName, setTopicName] = useState('')
  // Track incorrect items to re-queue at the end
  const [retryQueue, setRetryQueue] = useState<LearnPhrase[]>([])

  useEffect(() => {
    if (!topicId) return
    apiFetch<{ questions: QuizQuestion[]; topicName: string }>(`/api/quiz?topic_id=${topicId}&limit=10&mode=multiple_choice`)
      .then(data => {
        setTopicName(data.topicName)
        // Build learn queue: each phrase × 4 stages
        const queue: LearnPhrase[] = []
        for (const q of data.questions) {
          for (const stage of [1, 2, 3, 4] as Stage[]) {
            queue.push({ ...q, stage, passed: false })
          }
        }
        setItems(queue)
      })
      .catch(() => toast.error('Không thể tải dữ liệu học'))
      .finally(() => setLoading(false))
  }, [topicId])

  const current = items[index]
  const totalPhrases = items.length / 4
  const completedPhrases = Math.floor(index / 4)
  const progress = items.length > 0 ? (index / items.length) * 100 : 0

  // Collect distractors (other translations) for stage 2
  const distractors = items
    .filter(it => it.phraseId !== current?.phraseId)
    .map(it => it.translation)
    .filter((t, i, arr) => arr.indexOf(t) === i)

  function advance(correct: boolean) {
    if (!correct && current.stage === 2) {
      // Queue back to stage 1 for review
      setRetryQueue(prev => [...prev, { ...current, stage: 1 }])
    }
    if (index + 1 >= items.length) {
      if (retryQueue.length > 0) {
        // Append retry items and continue
        setItems(prev => [...prev, ...retryQueue])
        setRetryQueue([])
        toast(`Ôn lại ${retryQueue.length} câu chưa thuộc 🔁`, { duration: 2500 })
      } else {
        setFinished(true)
        toast.success(`Xuất sắc! Học xong ${totalPhrases} câu 🎓`, { duration: 3000 })
      }
    }
    setIndex(i => i + 1)
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
      </div>
    )
  }

  if (!topicId) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-[#999] text-sm">Thiếu topic_id</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between gap-4">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors shrink-0">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>

          {/* Stage pill */}
          {current && (
            <div className={cn('flex items-center gap-1.5 text-[12px] font-medium', STAGE_META[current.stage].color)}>
              {STAGE_META[current.stage].icon}
              <span>{STAGE_META[current.stage].label}</span>
            </div>
          )}

          <span className="text-[13px] text-[#666] tabular-nums shrink-0">
            {completedPhrases} / {totalPhrases}
          </span>
        </div>

        {/* Progress bar */}
        <div className="h-[2px] bg-[#f0f0f0] dark:bg-[#222]">
          <div className="h-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>

        {/* Stage steps */}
        <div className="mx-auto max-w-2xl px-4 py-2 flex items-center gap-1">
          {([1, 2, 3, 4] as Stage[]).map(s => (
            <div key={s} className="flex-1 flex flex-col items-center gap-1">
              <div className={cn(
                'h-1 w-full rounded-full transition-colors',
                current?.stage === s ? 'bg-[#171717] dark:bg-[#f5f5f5]' :
                current && s < current.stage ? 'bg-[#999]' : 'bg-[#eee] dark:bg-[#333]'
              )} />
              <span className={cn(
                'text-[9px] font-medium uppercase tracking-wide hidden sm:block',
                current?.stage === s ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-[#bbb]'
              )}>
                {STAGE_META[s].label}
              </span>
            </div>
          ))}
        </div>
      </header>

      {/* Hint bar */}
      {current && (
        <div className="mx-auto max-w-2xl px-4 py-3">
          <p className="text-[12px] text-[#999] flex items-center gap-1.5">
            <Sparkles className="h-3 w-3" />
            {STAGE_META[current.stage].hint}
          </p>
        </div>
      )}

      <main className="mx-auto max-w-2xl px-4 pb-12">
        {finished ? (
          <LearnComplete
            total={totalPhrases}
            onRetry={() => { setIndex(0); setFinished(false) }}
            onBack={() => router.back()}
          />
        ) : current ? (
          <div>
            {current.stage === 1 && (
              <StageIntroduce item={current} onNext={() => advance(true)} />
            )}
            {current.stage === 2 && (
              <StageChoice item={current} distractors={distractors} onResult={advance} />
            )}
            {current.stage === 3 && (
              <StageFill item={current} onResult={advance} />
            )}
            {current.stage === 4 && (
              <StageType item={current} onResult={advance} />
            )}
          </div>
        ) : (
          <div className="flex justify-center py-20">
            <Loader2 className="h-5 w-5 animate-spin text-[#999]" />
          </div>
        )}
      </main>
    </div>
  )
}

export default function LearnPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#999]" />
      </div>
    }>
      <LearnContent />
    </Suspense>
  )
}
