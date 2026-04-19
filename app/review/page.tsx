'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  RotateCcw, Volume2, Flame, Trophy,
  CheckCircle2, Brain, Zap, Loader2, BookOpen, ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { recordStudyToday, getStreak } from '@/lib/streak'
import { toast } from 'sonner'
import type { Phrase } from '@/db/schema'
import type { ReviewResult } from '@/lib/srs'

/* ─── Types ─────────────────────────────────────────────────── */
type DuePhrase = Pick<Phrase,
  | 'id' | 'topic_id' | 'sample_sentence' | 'translation' | 'pronunciation'
  | 'type' | 'structure' | 'function' | 'example1' | 'example1_translation'
  | 'example1_pronunciation' | 'example2' | 'example2_translation'
  | 'example2_pronunciation' | 'ease_factor' | 'review_interval' | 'repetitions'
>

/* ─── Rating buttons config ───────────────────────────────── */
const RATINGS: { result: ReviewResult; label: string; desc: string; color: string; icon: React.ReactNode }[] = [
  { result: 'again', label: 'Quên rồi',  desc: '< 1 ngày',  color: 'border-red-300 bg-red-50 hover:bg-red-100 text-red-700 dark:border-red-700 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400',     icon: <RotateCcw className="h-4 w-4" /> },
  { result: 'hard',  label: 'Khó',       desc: '~1 ngày',   color: 'border-orange-300 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:border-orange-700 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 dark:text-orange-400', icon: <Brain className="h-4 w-4" /> },
  { result: 'good',  label: 'Ổn',        desc: 'vài ngày',  color: 'border-emerald-300 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:border-emerald-700 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400', icon: <CheckCircle2 className="h-4 w-4" /> },
  { result: 'easy',  label: 'Dễ lắm',   desc: '> 1 tuần',  color: 'border-sky-300 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:border-sky-700 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 dark:text-sky-400',       icon: <Zap className="h-4 w-4" /> },
]

function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    window.speechSynthesis.speak(u)
  }
}

/* ─── Session Complete Screen ────────────────────────────────── */
function SessionComplete({ done, streak }: { done: number; streak: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      <div className="mb-6 flex h-24 w-24 items-center justify-center rounded-full bg-gradient-to-br from-orange-400 to-amber-500 shadow-xl shadow-orange-300/40">
        <Trophy className="h-12 w-12 text-white" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
        Hoàn thành buổi ôn tập! 🎉
      </h2>
      <p className="text-gray-500 dark:text-gray-400 mb-1">
        Đã ôn <strong className="text-gray-800 dark:text-gray-200">{done} câu</strong> hôm nay
      </p>
      {streak > 1 && (
        <div className="flex items-center gap-1.5 mt-2 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
          <Flame className="h-4 w-4 text-orange-500" />
          <span className="text-sm font-semibold text-orange-600 dark:text-orange-400">{streak} ngày liên tiếp!</span>
        </div>
      )}
      <div className="flex gap-3 mt-8">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors"
        >
          <BookOpen className="h-4 w-4" /> Quản lý chủ đề
        </Link>
        <Button
          onClick={() => window.location.reload()}
          className="bg-gradient-to-r from-orange-500 to-amber-500 text-white hover:from-orange-400 hover:to-amber-400"
        >
          <RotateCcw className="mr-2 h-4 w-4" /> Ôn tiếp
        </Button>
      </div>
    </div>
  )
}

/* ─── Main Page ──────────────────────────────────────────────── */
export default function ReviewPage() {
  const router = useRouter()

  const [phrases, setPhrases]   = useState<DuePhrase[]>([])
  const [index, setIndex]       = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(0)
  const [streak, setStreak]     = useState(0)
  const [finished, setFinished] = useState(false)

  // Load due phrases
  useEffect(() => {
    apiFetch<{ phrases: DuePhrase[]; count: number }>('/api/review/due?limit=30')
      .then(data => {
        setPhrases(data.phrases)
        if (data.count === 0) setFinished(true)
      })
      .catch(() => toast.error('Không thể tải câu ôn tập'))
      .finally(() => setLoading(false))

    setStreak(getStreak().count)
  }, [])

  const current = phrases[index]

  const submitResult = useCallback(async (result: ReviewResult) => {
    if (!current || submitting) return
    setSubmitting(true)
    try {
      await apiFetch('/api/review/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phraseId: current.id, result }),
      })

      const newDone = done + 1
      setDone(newDone)

      // Update streak khi ôn ít nhất 1 câu
      if (newDone === 1) {
        const s = recordStudyToday()
        setStreak(s.count)
      }

      if (index + 1 >= phrases.length) {
        setFinished(true)
      } else {
        setIndex(i => i + 1)
        setFlipped(false)
      }
    } catch {
      toast.error('Lưu kết quả thất bại')
    } finally {
      setSubmitting(false)
    }
  }, [current, done, index, phrases.length, submitting])

  // Keyboard shortcuts
  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!flipped || !current) return
      if (e.key === '1') submitResult('again')
      if (e.key === '2') submitResult('hard')
      if (e.key === '3') submitResult('good')
      if (e.key === '4') submitResult('easy')
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [flipped, current, submitResult])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-slate-50 to-orange-50 dark:from-slate-950 dark:to-orange-950/20">
        <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/40 dark:from-slate-950 dark:to-orange-950/10">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>

          <div className="flex items-center gap-3">
            {/* Streak badge */}
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
                <Flame className="h-3.5 w-3.5 text-orange-500" />
                <span className="text-xs font-bold text-orange-600 dark:text-orange-400">{streak}</span>
              </div>
            )}
            {/* Progress */}
            {!finished && phrases.length > 0 && (
              <span className="text-sm text-gray-500">
                {index + 1} / {phrases.length}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar */}
        {!finished && phrases.length > 0 && (
          <div className="h-1 bg-gray-100 dark:bg-gray-800">
            <div
              className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
              style={{ width: `${((index) / phrases.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {finished ? (
          <SessionComplete done={done} streak={streak} />
        ) : current ? (
          <div className="space-y-6">
            {/* Flip Card */}
            <div
              onClick={() => { if (!flipped) setFlipped(true) }}
              className={cn(
                'relative rounded-3xl border bg-white dark:bg-gray-900 shadow-xl shadow-gray-200/60 dark:shadow-black/30 transition-all duration-300 cursor-pointer select-none overflow-hidden',
                !flipped && 'hover:shadow-2xl hover:-translate-y-0.5',
                flipped && 'cursor-default'
              )}
            >
              {/* Front */}
              <div className="px-8 pt-8 pb-6">
                {/* Type badge */}
                {current.type && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {current.type.split(',').map(t => (
                      <span key={t} className="rounded-full bg-orange-50 dark:bg-orange-900/30 border border-orange-100 dark:border-orange-800 px-2.5 py-0.5 text-xs font-medium text-orange-600 dark:text-orange-400">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                )}

                {/* Sample sentence */}
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-2xl font-bold text-gray-900 dark:text-white leading-snug">
                    {current.sample_sentence}
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); speak(current.sample_sentence) }}
                    className="mt-1 shrink-0 rounded-full p-2 text-gray-400 hover:bg-orange-50 dark:hover:bg-orange-900/30 hover:text-orange-500 transition-colors"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>

                {/* Pronunciation */}
                {current.pronunciation && (
                  <p className="mt-2 font-mono text-sm text-gray-400">{current.pronunciation}</p>
                )}

                {/* SRS info */}
                <div className="mt-4 flex items-center gap-3 text-xs text-gray-400">
                  <span>EF: {(current.ease_factor ?? 2.5).toFixed(1)}</span>
                  <span>·</span>
                  <span>Ôn lần {(current.repetitions ?? 0) + 1}</span>
                </div>
              </div>

              {/* Flip hint */}
              {!flipped && (
                <div className="px-8 pb-6">
                  <div className="flex items-center justify-center gap-2 rounded-xl border border-dashed border-gray-200 dark:border-gray-700 py-4 text-sm text-gray-400 hover:border-orange-300 hover:text-orange-400 transition-colors">
                    <RotateCcw className="h-4 w-4" />
                    Nhấn để xem đáp án
                  </div>
                </div>
              )}

              {/* Back (revealed) */}
              {flipped && (
                <div className="border-t border-gray-100 dark:border-gray-800 px-8 py-6 space-y-4 bg-gray-50/50 dark:bg-gray-800/30">
                  {/* Translation */}
                  {current.translation && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Dịch nghĩa</p>
                      <p className="text-lg text-gray-800 dark:text-gray-200 font-medium">{current.translation}</p>
                    </div>
                  )}

                  {/* Structure */}
                  {current.structure && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-1">Cấu trúc</p>
                      <p className="text-sm text-gray-700 dark:text-gray-300 font-mono">{current.structure}</p>
                    </div>
                  )}

                  {/* Examples */}
                  {(current.example1 || current.example2) && (
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-2">Ví dụ</p>
                      <div className="space-y-2">
                        {[
                          { sentence: current.example1, translation: current.example1_translation, pron: current.example1_pronunciation },
                          { sentence: current.example2, translation: current.example2_translation, pron: current.example2_pronunciation },
                        ].filter(ex => ex.sentence).map((ex, i) => (
                          <div key={i} className="rounded-lg bg-white dark:bg-gray-800 border border-gray-100 dark:border-gray-700 p-3">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-orange-500">{i + 1}</span>
                              <p className="text-sm font-medium text-gray-800 dark:text-gray-200">{ex.sentence}</p>
                              <button
                                onClick={() => speak(ex.sentence!)}
                                className="ml-auto text-gray-400 hover:text-orange-400"
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {ex.pron && <p className="mt-0.5 pl-3.5 font-mono text-xs text-gray-400">{ex.pron}</p>}
                            {ex.translation && <p className="mt-0.5 pl-3.5 text-xs text-gray-500 dark:text-gray-400">{ex.translation}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Rating buttons */}
            {flipped && (
              <div className="space-y-3">
                <p className="text-center text-xs text-gray-400 uppercase tracking-wider">Mức độ nhớ của bạn?</p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RATINGS.map((r, i) => (
                    <button
                      key={r.result}
                      disabled={submitting}
                      onClick={() => submitResult(r.result)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-xl border-2 px-3 py-3 text-sm font-semibold transition-all active:scale-95 disabled:opacity-50',
                        r.color
                      )}
                    >
                      {r.icon}
                      <span>{r.label}</span>
                      <span className="text-[10px] font-normal opacity-70">{r.desc}</span>
                      <kbd className="hidden sm:block text-[9px] font-mono opacity-50 mt-0.5">{i + 1}</kbd>
                    </button>
                  ))}
                </div>
                <p className="text-center text-[10px] text-gray-400">
                  Phím tắt: <kbd className="font-mono">1</kbd> Quên · <kbd className="font-mono">2</kbd> Khó · <kbd className="font-mono">3</kbd> Ổn · <kbd className="font-mono">4</kbd> Dễ
                </p>
              </div>
            )}
          </div>
        ) : (
          <SessionComplete done={0} streak={streak} />
        )}
      </main>
    </div>
  )
}
