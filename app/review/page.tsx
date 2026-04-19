'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  RotateCcw, Volume2, Flame, Trophy,
  CheckCircle2, Brain, Zap, Loader2, BookOpen, ArrowLeft
} from 'lucide-react'
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

/* ─── Rating buttons config — semantic SRS colors (keep) ─── */
const RATINGS: { result: ReviewResult; label: string; desc: string; color: string; icon: React.ReactNode }[] = [
  { result: 'again', label: 'Quên rồi',  desc: '< 1 ngày',  color: 'border-red-200 bg-red-50 hover:bg-red-100 text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:hover:bg-red-900/40 dark:text-red-400',     icon: <RotateCcw className="h-4 w-4" /> },
  { result: 'hard',  label: 'Khó',       desc: '~1 ngày',   color: 'border-orange-200 bg-orange-50 hover:bg-orange-100 text-orange-700 dark:border-orange-800 dark:bg-orange-900/20 dark:hover:bg-orange-900/40 dark:text-orange-400', icon: <Brain className="h-4 w-4" /> },
  { result: 'good',  label: 'Ổn',        desc: 'vài ngày',  color: 'border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/20 dark:hover:bg-emerald-900/40 dark:text-emerald-400', icon: <CheckCircle2 className="h-4 w-4" /> },
  { result: 'easy',  label: 'Dễ lắm',   desc: '> 1 tuần',  color: 'border-sky-200 bg-sky-50 hover:bg-sky-100 text-sky-700 dark:border-sky-800 dark:bg-sky-900/20 dark:hover:bg-sky-900/40 dark:text-sky-400',       icon: <Zap className="h-4 w-4" /> },
]

function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    window.speechSynthesis.speak(u)
  }
}

/* ─── Session Complete Screen — Vercel chrome ────────────────── */
function SessionComplete({ done, streak }: { done: number; streak: number }) {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-4">
      {/* Trophy — semantic celebration (keep amber gradient) */}
      <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[#171717] dark:bg-[#f5f5f5]">
        <Trophy className="h-10 w-10 text-white dark:text-[#171717]" />
      </div>
      <h2 className="text-[24px] font-semibold tracking-tight text-[#171717] dark:text-[#f5f5f5] mb-2">
        Hoàn thành buổi ôn tập! 🎉
      </h2>
      <p className="text-[14px] text-[#666] dark:text-[#888] mb-1">
        Đã ôn <strong className="text-[#171717] dark:text-[#f5f5f5] font-semibold">{done} câu</strong> hôm nay
      </p>
      {streak > 1 && (
        <div className="flex items-center gap-1.5 mt-3 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20"
          style={{ boxShadow: 'var(--shadow-ring-light)' }}>
          <Flame className="h-3.5 w-3.5 text-orange-500" />
          <span className="text-[13px] font-semibold text-orange-600 dark:text-orange-400">{streak} ngày liên tiếp!</span>
        </div>
      )}
      <div className="flex gap-3 mt-8">
        <Link
          href="/"
          className="inline-flex items-center justify-center gap-2 rounded-[6px] px-4 py-2.5 text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] transition-colors"
          style={{ boxShadow: 'var(--shadow-border)' }}
        >
          <BookOpen className="h-3.5 w-3.5" /> Quản lý chủ đề
        </Link>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center justify-center gap-2 rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5] px-4 py-2.5 text-[13px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity"
        >
          <RotateCcw className="h-3.5 w-3.5" /> Ôn tiếp
        </button>
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
      if (newDone === 1) {
        const s = recordStudyToday()
        setStreak(s.count)
      }
      if (index + 1 >= phrases.length) setFinished(true)
      else { setIndex(i => i + 1); setFlipped(false) }
    } catch {
      toast.error('Lưu kết quả thất bại')
    } finally {
      setSubmitting(false)
    }
  }, [current, done, index, phrases.length, submitting])

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
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">

      {/* ── Header ── */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>

          <div className="flex items-center gap-3">
            {/* Streak badge — semantic orange (keep) */}
            {streak > 0 && (
              <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-orange-50 dark:bg-orange-900/20"
                style={{ boxShadow: 'var(--shadow-ring-light)' }}>
                <Flame className="h-3 w-3 text-orange-500" />
                <span className="text-[11px] font-bold text-orange-600 dark:text-orange-400">{streak}</span>
              </div>
            )}
            {!finished && phrases.length > 0 && (
              <span className="text-[13px] text-[#666] tabular-nums">
                {index + 1} / {phrases.length}
              </span>
            )}
          </div>
        </div>

        {/* Progress bar — Vercel dark */}
        {!finished && phrases.length > 0 && (
          <div className="h-[2px] bg-[#f0f0f0] dark:bg-[#222]">
            <div
              className="h-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-500"
              style={{ width: `${(index / phrases.length) * 100}%` }}
            />
          </div>
        )}
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8">
        {finished ? (
          <SessionComplete done={done} streak={streak} />
        ) : current ? (
          <div className="space-y-4">
            {/* ── Flip Card ── */}
            <div
              onClick={() => { if (!flipped) setFlipped(true) }}
              className={cn(
                'relative rounded-[8px] bg-white dark:bg-[#111] transition-all duration-200 cursor-pointer select-none overflow-hidden',
                !flipped && 'hover:opacity-95'
              )}
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              {/* Front */}
              <div className="px-6 pt-6 pb-5">
                {/* Type badge — Vercel pill */}
                {current.type && (
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {current.type.split(',').map(t => (
                      <span key={t} className="badge-vercel">{t.trim()}</span>
                    ))}
                  </div>
                )}

                {/* Sample sentence */}
                <div className="flex items-start gap-3">
                  <p className="flex-1 text-[22px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-snug tracking-tight">
                    {current.sample_sentence}
                  </p>
                  <button
                    onClick={e => { e.stopPropagation(); speak(current.sample_sentence) }}
                    className="mt-1 shrink-0 rounded-[6px] p-2 text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
                    style={{ boxShadow: 'var(--shadow-ring-light)' }}
                  >
                    <Volume2 className="h-4 w-4" />
                  </button>
                </div>

                {/* Pronunciation */}
                {current.pronunciation && (
                  <p className="mt-2 font-mono text-[13px] text-[#999]">{current.pronunciation}</p>
                )}

                {/* SRS info */}
                <div className="mt-4 flex items-center gap-3 text-[11px] text-[#bbb]">
                  <span className="tabular-nums">EF: {(current.ease_factor ?? 2.5).toFixed(1)}</span>
                  <span>·</span>
                  <span>Ôn lần {(current.repetitions ?? 0) + 1}</span>
                </div>
              </div>

              {/* Flip hint */}
              {!flipped && (
                <div className="px-6 pb-5">
                  <div className="flex items-center justify-center gap-2 rounded-[6px] py-4 text-[13px] text-[#999] border border-dashed border-[#e5e5e5] dark:border-[#333] hover:border-[#bbb] hover:text-[#666] transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Nhấn để xem đáp án
                  </div>
                </div>
              )}

              {/* Back — revealed */}
              {flipped && (
                <div className="px-6 py-5 space-y-4 bg-[#fafafa] dark:bg-[#0d0d0d]"
                  style={{ boxShadow: 'rgba(0,0,0,0.04) 0px -1px 0px 0px' }}>

                  {/* Translation */}
                  {current.translation && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-widest text-[#999] mb-1">Dịch nghĩa</p>
                      <p className="text-[16px] text-[#171717] dark:text-[#f5f5f5] font-medium">{current.translation}</p>
                    </div>
                  )}

                  {/* Structure */}
                  {current.structure && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-widest text-[#999] mb-1">Cấu trúc</p>
                      <p className="text-[13px] text-[#444] dark:text-[#aaa] font-mono">{current.structure}</p>
                    </div>
                  )}

                  {/* Examples */}
                  {(current.example1 || current.example2) && (
                    <div>
                      <p className="text-[10px] font-medium uppercase tracking-widest text-[#999] mb-2">Ví dụ</p>
                      <div className="space-y-2">
                        {[
                          { sentence: current.example1, translation: current.example1_translation, pron: current.example1_pronunciation },
                          { sentence: current.example2, translation: current.example2_translation, pron: current.example2_pronunciation },
                        ].filter(ex => ex.sentence).map((ex, i) => (
                          <div key={i} className="rounded-[6px] bg-white dark:bg-[#111] p-3"
                            style={{ boxShadow: 'var(--shadow-ring-light)' }}>
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold text-[#999] tabular-nums">{i + 1}</span>
                              <p className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] flex-1">{ex.sentence}</p>
                              <button
                                onClick={() => speak(ex.sentence!)}
                                className="ml-auto text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors"
                              >
                                <Volume2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                            {ex.pron && <p className="mt-0.5 pl-4 font-mono text-[11px] text-[#bbb]">{ex.pron}</p>}
                            {ex.translation && <p className="mt-0.5 pl-4 text-[12px] text-[#888]">{ex.translation}</p>}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* ── Rating buttons — SRS semantic colors (keep) ── */}
            {flipped && (
              <div className="space-y-3">
                <p className="text-center text-[10px] font-medium uppercase tracking-widest text-[#bbb]">
                  Mức độ nhớ của bạn?
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {RATINGS.map((r, i) => (
                    <button
                      key={r.result}
                      disabled={submitting}
                      onClick={() => submitResult(r.result)}
                      className={cn(
                        'flex flex-col items-center gap-1 rounded-[8px] border px-3 py-3 text-[13px] font-medium transition-all active:scale-95 disabled:opacity-50',
                        r.color
                      )}
                    >
                      {r.icon}
                      <span>{r.label}</span>
                      <span className="text-[10px] font-normal opacity-70">{r.desc}</span>
                      <kbd className="hidden sm:block text-[9px] font-mono opacity-40 mt-0.5">{i + 1}</kbd>
                    </button>
                  ))}
                </div>
                <p className="text-center text-[10px] text-[#bbb]">
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
