'use client'

import { useState, useEffect, useCallback, useRef, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import {
  RotateCcw, Volume2, Flame, Trophy,
  CheckCircle2, Brain, Zap, Loader2, BookOpen, ArrowLeft, Mic, MicOff, X, Lightbulb, Star, ChevronRight
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { recordStudyToday, getStreak } from '@/lib/streak'
import { toggleStar, getStarred } from '@/lib/starred'
import { toast } from 'sonner'
import { speak } from '@/lib/tts'
import { addXP, xpToastMessage } from '@/lib/xp'
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


/* ─── Pronunciation Panel (Web Speech API) ─────────────── */
type WordStatus = 'correct' | 'close' | 'wrong' | 'missing'

function scoreSentence(spoken: string, target: string): { words: { word: string; status: WordStatus }[]; score: number } {
  const norm  = (s: string) => s.toLowerCase().replace(/[^a-z0-9']/g, '')
  const tw    = target.split(/\s+/).filter(Boolean)
  const sw    = spoken.split(/\s+/).filter(Boolean)
  let correct = 0

  const words = tw.map((tw_word, i) => {
    const t = norm(tw_word)
    const s = norm(sw[i] ?? '')
    if (!s) return { word: tw_word, status: 'missing' as WordStatus }
    if (s === t) { correct++; return { word: tw_word, status: 'correct' as WordStatus } }
    // Levenshtein distance <= 1 = "close"
    const dist = Math.abs(s.length - t.length) <= 2 &&
      [...t].filter((c, j) => c !== (s[j] ?? '')).length <= 2
    if (dist) { correct += 0.5; return { word: tw_word, status: 'close' as WordStatus } }
    return { word: tw_word, status: 'wrong' as WordStatus }
  })

  return { words, score: Math.round((correct / tw.length) * 100) }
}

function PronunciationPanel({ sentence, onClose }: { sentence: string; onClose: () => void }) {
  const [state, setState]   = useState<'idle' | 'recording'>('idle')
  const [result, setResult] = useState<ReturnType<typeof scoreSentence> | null>(null)
  const [error, setError]   = useState('')
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const recRef              = useRef<any>(null)

  // Safely get SpeechRecognition constructor (Chrome = webkit prefix)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  function getSR(): (new () => any) | null {
    if (typeof window === 'undefined') return null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any
    return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null
  }

  function startRecording() {
    const SR = getSR()
    if (!SR) { setError('Trình duyệt không hỗ trợ ghi âm'); return }
    setResult(null)
    setError('')
    setState('recording')
    const rec = new SR()
    recRef.current = rec
    rec.lang = 'en-US'
    rec.interimResults = false
    rec.onresult = (e: { results: { 0: { transcript: string } }[] }) => {
      const spoken = e.results[0][0].transcript
      setResult(scoreSentence(spoken, sentence))
      setState('idle')
    }
    rec.onerror = () => { setError('Không nhận được giọng nói. Thử lại.'); setState('idle') }
    rec.onend   = () => { setState((s: 'idle' | 'recording' | 'done') => s === 'recording' ? 'idle' : s) }
    rec.start()
  }

  function reset() {
    recRef.current?.abort()
    setState('idle')
    setResult(null)
    setError('')
  }

  if (!getSR() && !error) return null // silently hide if unsupported

  const statusColor: Record<WordStatus, string> = {
    correct: 'text-emerald-500',
    close:   'text-amber-500',
    wrong:   'text-red-500',
    missing: 'text-[#ccc]',
  }

  return (
    <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] p-4 space-y-3"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Mic className="h-3.5 w-3.5 text-[#666]" />
          <span className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">Luyện phát âm</span>
        </div>
        <button onClick={onClose} className="text-[#bbb] hover:text-[#666] transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Sentence display */}
      <div className="rounded-[6px] bg-white dark:bg-[#111] px-4 py-3"
        style={{ boxShadow: 'var(--shadow-ring-light)' }}>
        {result ? (
          <p className="text-[15px] font-semibold leading-relaxed">
            {result.words.map((w, i) => (
              <span key={i} className={`${statusColor[w.status]} mr-1`}>{w.word}</span>
            ))}
          </p>
        ) : (
          <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-relaxed">{sentence}</p>
        )}
      </div>

      {/* Controls */}
      <div className="flex items-center gap-3">
        {state === 'idle' && (
          <>
            <button onClick={startRecording}
              className="flex items-center gap-2 rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5] px-4 py-2 text-[13px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
              <Mic className="h-3.5 w-3.5" /> {result ? 'Thử lại' : 'Bắt đầu ghi âm'}
            </button>
            {result && (
              <div className={`text-[14px] font-bold tabular-nums ${
                result.score >= 80 ? 'text-emerald-500' : result.score >= 50 ? 'text-amber-500' : 'text-red-500'
              }`}>
                {result.score}%
              </div>
            )}
          </>
        )}
        {state === 'recording' && (
          <div className="flex items-center gap-2 text-[13px] text-red-500 animate-pulse">
            <MicOff className="h-3.5 w-3.5" /> Đang ghi âm...
          </div>
        )}
        {error && <p className="text-[12px] text-red-500">{error}</p>}
      </div>

      {/* Legend */}
      {result && (
        <div className="flex items-center gap-3 text-[10px] text-[#999]">
          <span className="text-emerald-500 font-medium">● Đúng</span>
          <span className="text-amber-500 font-medium">● Gần đúng</span>
          <span className="text-red-500 font-medium">● Sai</span>
          <span className="text-[#ccc] font-medium">● Thiếu</span>
        </div>
      )}
    </div>
  )
}

/* ─── AI Explain Panel ──────────────────────────────── */
function AIExplainPanel({ sentence, translation, structure, onClose }: {
  sentence: string; translation?: string; structure?: string; onClose: () => void
}) {
  const [text, setText]       = useState('')
  const [loading, setLoading] = useState(false)
  const [fetched, setFetched] = useState(false)

  useEffect(() => {
    if (fetched) return
    setLoading(true)
    fetch('/api/explain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sentence, translation, structure }),
    })
      .then(r => r.json())
      .then((d: { statusCode?: number; message?: string; data?: { explanation?: string } }) => {
        if (d.data?.explanation) {
          setText(d.data.explanation)
        } else {
          console.error('[AIExplain] API error:', d)
          setText(`Lỗi: ${d.message ?? 'Không thể giải thích lúc này'}`)
        }
      })
      .catch((e) => {
        console.error('[AIExplain] fetch error:', e)
        setText('Lỗi kết nối AI.')
      })
      .finally(() => { setLoading(false); setFetched(true) })
  }, [fetched, sentence, translation, structure])

  // Render markdown-lite: **bold** and numbered sections
  function renderText(raw: string) {
    return raw.split('\n').filter(Boolean).map((line, i) => {
      const parts = line.split(/\*\*(.*?)\*\*/g)
      return (
        <p key={i} className="text-[13px] leading-relaxed text-[#444] dark:text-[#bbb] mb-2">
          {parts.map((p, j) => j % 2 === 1 ? <strong key={j} className="text-[#171717] dark:text-[#f5f5f5] font-semibold">{p}</strong> : p)}
        </p>
      )
    })
  }

  return (
    <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] p-4 space-y-3"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Lightbulb className="h-3.5 w-3.5 text-amber-500" />
          <span className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">Giải thích</span>
        </div>
        <button onClick={onClose} className="text-[#bbb] hover:text-[#666] transition-colors">
          <X className="h-3.5 w-3.5" />
        </button>
      </div>
      <div className="rounded-[6px] bg-white dark:bg-[#111] px-4 py-3 min-h-[80px]"
        style={{ boxShadow: 'var(--shadow-ring-light)' }}>
        {loading ? (
          <div className="flex items-center gap-2 text-[13px] text-[#999]">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang phân tích...
          </div>
        ) : renderText(text)}
      </div>
    </div>
  )
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

/* ─── Inner page (uses useSearchParams) ───────────────────── */
function ReviewPageInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const limitParam   = Math.min(parseInt(searchParams.get('limit')   ?? '30', 10), 200)
  const topicParam   = searchParams.get('topic_id')

  const [phrases, setPhrases]   = useState<DuePhrase[]>([])
  const [index, setIndex]       = useState(0)
  const [flipped, setFlipped]   = useState(false)
  const [loading, setLoading]   = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [done, setDone]         = useState(0)
  const [streak, setStreak]     = useState(0)
  const [finished, setFinished] = useState(false)
  const [showPron, setShowPron]       = useState(false)
  const [showExplain, setShowExplain] = useState(false)
  const [starredSet, setStarredSet]   = useState<Set<number>>(new Set())

  // Swipe tracking
  const touchStartX = useRef<number | null>(null)
  const [swipeHint, setSwipeHint]     = useState<'left' | 'right' | null>(null)

  useEffect(() => {
    // Load starred from localStorage on mount
    setStarredSet(getStarred())
  }, [])

  useEffect(() => {
    const params = new URLSearchParams({ limit: String(limitParam) })
    if (topicParam) params.set('topic_id', topicParam)
    apiFetch<{ phrases: DuePhrase[]; count: number }>(`/api/review/due?${params}`)
      .then(data => {
        setPhrases(data.phrases)
        if (data.count === 0) setFinished(true)
      })
      .catch(() => toast.error('Không thể tải câu ôn tập'))
      .finally(() => setLoading(false))
    setStreak(getStreak().count)
  }, [])  // eslint-disable-line react-hooks/exhaustive-deps

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
      // Award XP
      const xp = addXP(result)
      toast(xpToastMessage(xp.gained, xp.leveledUp, xp.newLevel), {
        duration: xp.leveledUp ? 4000 : 1200,
        icon: xp.leveledUp ? '🎉' : '⚡',
      })
      const newDone = done + 1
      setDone(newDone)
      if (newDone === 1) {
        const s = recordStudyToday()
        setStreak(s.count)
      }
      if (index + 1 >= phrases.length) {
        setFinished(true)
        toast.success(`Hoàn thành! Đã ôn ${newDone} câu 🎉`, { duration: 3000 })
      }
      else { setIndex(i => i + 1); setFlipped(false); setShowPron(false); setShowExplain(false) }
    } catch {
      toast.error('Lưu kết quả thất bại')
    } finally {
      setSubmitting(false)
    }
  }, [current, done, index, phrases.length, submitting])

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (!current) return
      // Space / Enter: flip card, then submit 'good'
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault()
        if (!flipped) { setFlipped(true); return }
        submitResult('good')
        return
      }
      if (!flipped) return
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
            {/* Starred shortcut */}
            <Link href="/starred"
              className="flex items-center gap-1 text-[13px] text-[#999] hover:text-amber-500 transition-colors"
              title="Xem câu đã ghim">
              <Star className={cn('h-3.5 w-3.5', starredSet.size > 0 ? 'text-amber-400 fill-amber-400' : 'text-[#ccc]')} />
              {starredSet.size > 0 && <span className="text-[11px] tabular-nums text-amber-500">{starredSet.size}</span>}
            </Link>
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
              onTouchStart={e => {
                touchStartX.current = e.touches[0].clientX
                setSwipeHint(null)
              }}
              onTouchMove={e => {
                if (touchStartX.current === null || !flipped) return
                const dx = e.touches[0].clientX - touchStartX.current
                if (dx < -40) setSwipeHint('left')
                else if (dx > 40) setSwipeHint('right')
                else setSwipeHint(null)
              }}
              onTouchEnd={e => {
                if (touchStartX.current === null || !flipped) { touchStartX.current = null; return }
                const dx = e.changedTouches[0].clientX - touchStartX.current
                touchStartX.current = null
                setSwipeHint(null)
                if (dx < -60) submitResult('again')
                else if (dx > 60) submitResult('easy')
              }}
              className={cn(
                'relative rounded-[8px] bg-white dark:bg-[#1a1a1a] transition-all duration-200 cursor-pointer select-none overflow-hidden',
                !flipped && 'hover:opacity-95',
                swipeHint === 'left'  && 'ring-2 ring-red-400/60',
                swipeHint === 'right' && 'ring-2 ring-emerald-400/60',
              )}
              style={{ boxShadow: 'var(--shadow-card)' }}
            >
              {/* Swipe overlay hints */}
              {swipeHint === 'left' && (
                <div className="absolute inset-0 z-10 flex items-center justify-start px-6 bg-red-500/10 pointer-events-none">
                  <span className="text-[13px] font-bold text-red-500">← Quên</span>
                </div>
              )}
              {swipeHint === 'right' && (
                <div className="absolute inset-0 z-10 flex items-center justify-end px-6 bg-emerald-500/10 pointer-events-none">
                  <span className="text-[13px] font-bold text-emerald-500">Dễ →</span>
                </div>
              )}
              {/* Front */}
              <div className="px-6 pt-6 pb-5">
                {/* Type badge + star button row */}
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-wrap gap-1.5">
                    {current.type && current.type.split(',').map(t => (
                      <span key={t} className="badge-vercel">{t.trim()}</span>
                    ))}
                  </div>
                  <button
                    onClick={e => {
                      e.stopPropagation()
                      const nowStarred = toggleStar(current.id)
                      setStarredSet(prev => {
                        const next = new Set(prev)
                        nowStarred ? next.add(current.id) : next.delete(current.id)
                        return next
                      })
                      toast.success(nowStarred ? '⭐ Đã ghim' : 'Bỏ ghim')
                    }}
                    className="shrink-0 ml-2 rounded-[6px] p-1.5 transition-colors"
                    title={starredSet.has(current.id) ? 'Bỏ ghim' : 'Ghim câu này'}
                  >
                    <Star className={cn(
                      'h-4 w-4 transition-colors',
                      starredSet.has(current.id)
                        ? 'text-amber-400 fill-amber-400'
                        : 'text-[#ccc] hover:text-amber-400'
                    )} />
                  </button>
                </div>

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
                  <div className="flex items-center justify-center gap-2 rounded-[6px] py-4 text-[13px] text-[#999] border border-dashed border-[#e5e5e5] dark:border-[#484848] hover:border-[#aaa] dark:hover:border-[#666] dark:hover:text-[#bbb] hover:text-[#666] transition-colors">
                    <RotateCcw className="h-3.5 w-3.5" />
                    Nhấn để xem đáp án
                  </div>
                </div>
              )}

              {/* Back — revealed */}
              {flipped && (
                <div className="px-6 py-5 space-y-4 bg-[#fafafa] dark:bg-[#141414]"
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
                          <div key={i} className="rounded-[6px] bg-white dark:bg-[#222] p-3"
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

            {/* Pronunciation Panel */}
            {flipped && showPron && (
              <PronunciationPanel
                sentence={current.sample_sentence}
                onClose={() => setShowPron(false)}
              />
            )}

            {/* AI Explain Panel */}
            {flipped && showExplain && (
              <AIExplainPanel
                sentence={current.sample_sentence}
                translation={current.translation ?? undefined}
                structure={current.structure ?? undefined}
                onClose={() => setShowExplain(false)}
              />
            )}

            {/* Rating buttons */}
            {flipped && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] font-medium uppercase tracking-widest text-[#bbb]">
                    Mức độ nhớ của bạn?
                  </p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => { setShowExplain(p => !p); setShowPron(false) }}
                      className={cn(
                        'flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors',
                        showExplain
                          ? 'bg-amber-500 text-white'
                          : 'text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5]'
                      )}
                      style={showExplain ? {} : { boxShadow: 'var(--shadow-border)' }}
                    >
                      <Lightbulb className="h-3 w-3" /> Giải thích
                    </button>
                    <button
                      onClick={() => { setShowPron(p => !p); setShowExplain(false) }}
                      className={cn(
                        'flex items-center gap-1 rounded-[6px] px-2.5 py-1 text-[11px] font-medium transition-colors',
                        showPron
                          ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                          : 'text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5]'
                      )}
                      style={showPron ? {} : { boxShadow: 'var(--shadow-border)' }}
                    >
                      <Mic className="h-3 w-3" /> Phát âm
                    </button>
                  </div>
                </div>
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

                {/* Skip row */}
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-[#bbb]">
                    Phím tắt: <kbd className="font-mono">Space</kbd> Qua · <kbd className="font-mono">1</kbd> Quên · <kbd className="font-mono">2</kbd> Khó · <kbd className="font-mono">3</kbd> Ổn · <kbd className="font-mono">4</kbd> Dễ
                  </p>
                  <button
                    disabled={submitting}
                    onClick={() => submitResult('good')}
                    className="flex items-center gap-1 rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors disabled:opacity-40"
                    style={{ boxShadow: 'var(--shadow-border)' }}
                    title="Bỏ qua — tính là Ổn (phím Space)"
                  >
                    Qua <ChevronRight className="h-3 w-3" />
                  </button>
                </div>
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

/* ─── Root export ─────────────────────────────────────── */
export default function ReviewPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#e0e0e0] border-t-[#171717]" />
      </div>
    }>
      <ReviewPageInner />
    </Suspense>
  )
}
