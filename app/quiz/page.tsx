'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  Volume2, Loader2, ArrowLeft, CheckCircle2, XCircle,
  Trophy, RotateCcw, Brain, ChevronRight, Headphones, PenLine, Languages
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import type { QuizMode, QuizQuestion } from '@/app/api/quiz/route'

/* ─── Mode meta ─────────────────────────────────────────────── */
const MODE_META: Record<QuizMode, { label: string; icon: React.ReactNode; color: string; hint: string }> = {
  multiple_choice: { label: 'Trắc nghiệm',    icon: <Brain className="h-4 w-4" />,     color: 'text-violet-500', hint: 'Chọn bản dịch đúng' },
  fill_blank:      { label: 'Điền vào chỗ trống', icon: <PenLine className="h-4 w-4" />,  color: 'text-emerald-500', hint: 'Điền từ còn thiếu' },
  listening:       { label: 'Nghe hiểu',       icon: <Headphones className="h-4 w-4" />, color: 'text-sky-500',    hint: 'Nghe và chọn nghĩa đúng' },
  translation:     { label: 'Dịch câu',        icon: <Languages className="h-4 w-4" />,  color: 'text-orange-500', hint: 'Gõ câu tiếng Anh' },
}

function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    window.speechSynthesis.speak(u)
  }
}

/* ─── Session Complete ───────────────────────────────────────── */
function SessionComplete({
  score, total, onRetry, onBack
}: { score: number; total: number; onRetry: () => void; onBack: () => void }) {
  const pct = Math.round((score / total) * 100)
  const grade = pct >= 90 ? '🏆' : pct >= 70 ? '😊' : pct >= 50 ? '😐' : '😅'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-4 text-6xl">{grade}</div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-1">Hoàn thành Quiz!</h2>
      <p className="text-gray-500 dark:text-gray-400 mb-4">
        Đúng <strong className="text-gray-900 dark:text-white">{score}</strong> / {total} câu
      </p>

      {/* Score ring */}
      <div className="relative w-28 h-28 mb-6">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
            className="text-gray-100 dark:text-gray-800" />
          <circle cx="50" cy="50" r="42" fill="none" stroke="currentColor" strokeWidth="8"
            strokeDasharray={`${2 * Math.PI * 42}`}
            strokeDashoffset={`${2 * Math.PI * 42 * (1 - pct / 100)}`}
            strokeLinecap="round"
            className={pct >= 70 ? 'text-emerald-500' : pct >= 50 ? 'text-orange-500' : 'text-red-500'}
            style={{ transition: 'stroke-dashoffset 1s ease' }} />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl font-bold text-gray-900 dark:text-white">{pct}%</span>
        </div>
      </div>

      <div className="flex gap-3">
        <button onClick={onBack}
          className="flex items-center gap-2 rounded-xl border border-gray-200 dark:border-gray-700 px-5 py-2.5 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Quay lại
        </button>
        <button onClick={onRetry}
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-orange-400 hover:to-amber-400 transition-all">
          <RotateCcw className="h-4 w-4" /> Làm lại
        </button>
      </div>
    </div>
  )
}

/* ─── Individual Quiz Card ───────────────────────────────────── */
function QuizCard({
  q, onAnswer, index, total
}: {
  q: QuizQuestion
  onAnswer: (correct: boolean) => void
  index: number
  total: number
}) {
  const meta = MODE_META[q.mode]
  const [selected, setSelected]   = useState<number | null>(null)
  const [textInput, setTextInput]  = useState('')
  const [revealed, setRevealed]    = useState(false)
  const [isCorrect, setIsCorrect]  = useState<boolean | null>(null)
  const inputRef                   = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setSelected(null)
    setTextInput('')
    setRevealed(false)
    setIsCorrect(null)
    if (q.mode === 'fill_blank' || q.mode === 'translation') {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
    if (q.mode === 'listening') speak(q.sentence)
  }, [q])

  // Keyboard: 1–4 for multiple choice, Enter to submit text
  useEffect(() => {
    function kh(e: KeyboardEvent) {
      if (revealed) {
        if (e.key === 'Enter' || e.key === ' ') onAnswer(isCorrect ?? false)
        return
      }
      if (q.mode === 'multiple_choice' || q.mode === 'listening') {
        const n = parseInt(e.key, 10)
        if (n >= 1 && n <= 4 && q.options) handleMultipleChoice(n - 1)
      }
    }
    document.addEventListener('keydown', kh)
    return () => document.removeEventListener('keydown', kh)
  }, [q, revealed, isCorrect, onAnswer])

  function handleMultipleChoice(idx: number) {
    if (revealed) return
    const correct = idx === q.correctIndex
    setSelected(idx)
    setIsCorrect(correct)
    setRevealed(true)
  }

  function handleTextSubmit() {
    if (revealed) return
    const answer  = textInput.trim().toLowerCase()
    const correct = (q.mode === 'fill_blank' ? q.blankWord! : q.sentence)
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, '')
    const given   = answer.replace(/[^a-z0-9'\s]/g, '')
    const ok      = given === correct || levenshtein(given, correct) <= 2
    setIsCorrect(ok)
    setRevealed(true)
  }

  return (
    <div className="space-y-5">
      {/* Mode badge */}
      <div className="flex items-center justify-between">
        <div className={cn('flex items-center gap-1.5 text-xs font-semibold', meta.color)}>
          {meta.icon} {meta.label}
        </div>
        <span className="text-xs text-gray-400">{index + 1} / {total}</span>
      </div>

      {/* Question card */}
      <div className="rounded-2xl border bg-white dark:bg-gray-900 shadow-md p-6 space-y-4">

        {/* Listening: play button prominent */}
        {q.mode === 'listening' && (
          <div className="flex justify-center">
            <button onClick={() => speak(q.sentence)}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-sky-50 dark:bg-sky-900/30 border-2 border-sky-200 dark:border-sky-700 text-sky-500 hover:bg-sky-100 dark:hover:bg-sky-900/50 transition-colors">
              <Volume2 className="h-8 w-8" />
            </button>
          </div>
        )}

        {/* Sentence or translation as prompt */}
        {q.mode !== 'listening' && (
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">{meta.hint}</p>
            {q.mode === 'translation' ? (
              <p className="text-xl font-bold text-gray-900 dark:text-white leading-snug">{q.translation}</p>
            ) : q.mode === 'fill_blank' ? (
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <p className="flex-1 text-xl font-bold text-gray-900 dark:text-white leading-snug font-mono">
                    {q.blankedSentence}
                  </p>
                  {/* Nút loa đọc câu gốc để user nghe và điền từ */}
                  <button
                    onClick={() => speak(q.sentence)}
                    title="Nghe câu đầy đủ"
                    className="shrink-0 mt-0.5 rounded-full p-1.5 text-gray-400 hover:text-emerald-500 hover:bg-emerald-50 dark:hover:bg-emerald-900/30 transition-colors"
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>
                <p className="text-xs text-gray-400 italic">💡 Nhấn 🔊 để nghe câu hoàn chỉnh rồi điền từ còn thiếu</p>
              </div>
            ) : (
              <div className="flex items-start gap-2">
                <p className="flex-1 text-xl font-bold text-gray-900 dark:text-white leading-snug">{q.sentence}</p>
                <button onClick={() => speak(q.sentence)}
                  className="shrink-0 mt-0.5 rounded-full p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30">
                  <Volume2 className="h-4 w-4" />
                </button>
              </div>
            )}
          </div>
        )}

        {/* ── Multiple choice / Listening ── */}
        {(q.mode === 'multiple_choice' || q.mode === 'listening') && q.options && (
          <div className="grid gap-2">
            {q.options.map((opt, i) => {
              const isSelected = selected === i
              const isRight    = i === q.correctIndex
              let cls = 'flex items-center gap-3 w-full rounded-xl border-2 px-4 py-3 text-sm font-medium text-left transition-all'
              if (!revealed) {
                cls += ' border-gray-200 dark:border-gray-700 hover:border-orange-300 dark:hover:border-orange-700 hover:bg-orange-50 dark:hover:bg-orange-900/20 cursor-pointer'
              } else if (isRight) {
                cls += ' border-emerald-400 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400'
              } else if (isSelected && !isRight) {
                cls += ' border-red-400 bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400'
              } else {
                cls += ' border-gray-100 dark:border-gray-800 opacity-50'
              }
              return (
                <button key={i} className={cls} onClick={() => handleMultipleChoice(i)} disabled={revealed}>
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-current text-xs font-bold">
                    {i + 1}
                  </span>
                  <span className="flex-1">{opt}</span>
                  {revealed && isRight && <CheckCircle2 className="h-4 w-4 text-emerald-500 shrink-0" />}
                  {revealed && isSelected && !isRight && <XCircle className="h-4 w-4 text-red-500 shrink-0" />}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Câu tiếng Anh gốc — hiện sau khi chọn ── */}
        {revealed && (q.mode === 'listening' || q.mode === 'multiple_choice') && (
          <div className="rounded-xl bg-gray-50 dark:bg-gray-800/60 border border-gray-200 dark:border-gray-700 px-4 py-3">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mb-1.5">Câu tiếng Anh</p>
            <div className="flex items-center gap-2">
              <p className="flex-1 text-sm font-semibold text-gray-900 dark:text-white">{q.sentence}</p>
              <button
                onClick={() => speak(q.sentence)}
                className="shrink-0 rounded-full p-1.5 text-gray-400 hover:text-orange-500 hover:bg-orange-50 dark:hover:bg-orange-900/30 transition-colors"
              >
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
            {q.pronunciation && (
              <p className="mt-1 font-mono text-xs text-orange-400">{q.pronunciation}</p>
            )}
          </div>
        )}

        {/* ── Fill blank / Translation ── */}
        {(q.mode === 'fill_blank' || q.mode === 'translation') && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                ref={inputRef}
                value={textInput}
                onChange={e => setTextInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleTextSubmit() }}
                disabled={revealed}
                placeholder={q.mode === 'fill_blank' ? 'Điền từ...' : 'Nhập câu tiếng Anh...'}
                className={cn(
                  'flex-1 rounded-xl border-2 px-4 py-3 text-sm outline-none transition-all bg-white dark:bg-gray-800',
                  revealed && isCorrect
                    ? 'border-emerald-400 text-emerald-700 dark:text-emerald-400'
                    : revealed && !isCorrect
                    ? 'border-red-400 text-red-700 dark:text-red-400'
                    : 'border-gray-200 dark:border-gray-700 focus:border-orange-400'
                )}
              />
              {!revealed && (
                <button onClick={handleTextSubmit}
                  className="rounded-xl bg-orange-500 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-400 transition-colors">
                  OK
                </button>
              )}
            </div>
            {/* Đáp án sau khi reveal */}
            {revealed && !isCorrect && (
              <div className="rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800 px-4 py-2.5">
                <p className="text-xs text-emerald-600 dark:text-emerald-400 font-medium">
                  Đáp án: <span className="font-bold">
                    {q.mode === 'fill_blank' ? q.blankWord : q.sentence}
                  </span>
                </p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Result feedback + Next button */}
      {revealed && (
        <div className="flex items-center justify-between">
          <div className={cn('flex items-center gap-2 text-sm font-semibold', isCorrect ? 'text-emerald-600' : 'text-red-500')}>
            {isCorrect ? <CheckCircle2 className="h-5 w-5" /> : <XCircle className="h-5 w-5" />}
            {isCorrect ? 'Chính xác!' : 'Chưa đúng'}
          </div>
          <button
            onClick={() => onAnswer(isCorrect ?? false)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-2.5 text-sm font-semibold text-white hover:from-orange-400 hover:to-amber-400 transition-all"
          >
            Tiếp theo <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}
    </div>
  )
}

/* ─── Levenshtein distance (cho typing tolerance) ───────────── */
function levenshtein(a: string, b: string): number {
  const m = a.length, n = b.length
  const dp = Array.from({ length: m + 1 }, (_, i) =>
    Array.from({ length: n + 1 }, (_, j) => (i === 0 ? j : j === 0 ? i : 0))
  )
  for (let i = 1; i <= m; i++)
    for (let j = 1; j <= n; j++)
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1]
        : 1 + Math.min(dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1])
  return dp[m][n]
}

/* ─── Main Quiz Page ─────────────────────────────────────────── */
function QuizContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const topicId      = searchParams.get('topic_id')
  const topicName    = searchParams.get('topic_name') ?? 'Quiz'

  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [index, setIndex]         = useState(0)
  const [score, setScore]         = useState(0)
  const [loading, setLoading]     = useState(true)
  const [finished, setFinished]   = useState(false)

  const load = useCallback(() => {
    if (!topicId) { router.replace('/'); return }
    setLoading(true)
    setIndex(0)
    setScore(0)
    setFinished(false)
    apiFetch<{ questions: QuizQuestion[] }>(`/api/quiz?topic_id=${topicId}&limit=10&mode=random`)
      .then(d => setQuestions(d.questions))
      .catch(() => toast.error('Không thể tải quiz'))
      .finally(() => setLoading(false))
  }, [topicId, router])

  useEffect(() => { load() }, [load])

  function handleAnswer(correct: boolean) {
    if (correct) setScore(s => s + 1)
    if (index + 1 >= questions.length) {
      setFinished(true)
    } else {
      setIndex(i => i + 1)
    }
  }

  if (!topicId) return null

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-950 dark:to-orange-950/10">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <ArrowLeft className="h-4 w-4" /> {topicName}
          </button>

          {!finished && !loading && questions.length > 0 && (
            <div className="flex items-center gap-3">
              <span className="text-sm text-gray-500">{index + 1}/{questions.length}</span>
              <span className="text-sm font-semibold text-emerald-600">✓ {score}</span>
            </div>
          )}
        </div>

        {/* Progress */}
        {!finished && questions.length > 0 && (
          <div className="h-1 bg-gray-100 dark:bg-gray-800">
            <div className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
              style={{ width: `${(index / questions.length) * 100}%` }} />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-xl px-4 py-8">
        {loading && (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        )}

        {!loading && finished && (
          <SessionComplete
            score={score}
            total={questions.length}
            onRetry={load}
            onBack={() => router.back()}
          />
        )}

        {!loading && !finished && questions[index] && (
          <QuizCard
            key={index}
            q={questions[index]}
            index={index}
            total={questions.length}
            onAnswer={handleAnswer}
          />
        )}
      </main>
    </div>
  )
}

export default function QuizPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    }>
      <QuizContent />
    </Suspense>
  )
}
