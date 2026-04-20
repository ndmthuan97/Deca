'use client'

import { useState, useEffect, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, RotateCcw, Trophy, Zap, Timer } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import type { MatchCard } from '@/app/api/match/route'

/* ─── Types ─────────────────────────────────────────────────── */
type TileType = 'english' | 'vietnamese'
type TileState = 'idle' | 'selected' | 'matched' | 'wrong'

interface Tile {
  uid: string     // unique id per tile (id + type)
  phraseId: number
  text: string
  type: TileType
  state: TileState
}

/* ─── Shuffle helper ─────────────────────────────────────────── */
function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function buildTiles(cards: MatchCard[]): Tile[] {
  const en: Tile[] = cards.map(c => ({
    uid: `en-${c.id}`, phraseId: c.id, text: c.english,  type: 'english',    state: 'idle',
  }))
  const vi: Tile[] = cards.map(c => ({
    uid: `vi-${c.id}`, phraseId: c.id, text: c.vietnamese, type: 'vietnamese', state: 'idle',
  }))
  return shuffle([...en, ...vi])
}

/* ─── Timer display ──────────────────────────────────────────── */
function fmtTime(s: number) {
  const m = Math.floor(s / 60)
  const sec = s % 60
  return `${m}:${sec.toString().padStart(2, '0')}`
}

/* ─── Session Complete ───────────────────────────────────────── */
function MatchComplete({ time, pairs, onRetry, onBack }: {
  time: number; pairs: number; onRetry: () => void; onBack: () => void
}) {
  const speed = pairs > 0 ? Math.round(time / pairs) : 0
  const grade = time < pairs * 5 ? '🏆' : time < pairs * 10 ? '⭐' : '✅'

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6 text-center px-4">
      <div className="text-7xl">{grade}</div>
      <div>
        <h2 className="text-[24px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight">
          Hoàn thành!
        </h2>
        <p className="text-[14px] text-[#666] mt-1">Ghép đúng {pairs} cặp</p>
      </div>

      {/* Stats */}
      <div className="flex gap-6">
        <div className="flex flex-col items-center gap-1 rounded-[8px] px-6 py-4"
          style={{ boxShadow: 'var(--shadow-card)' }}>
          <Timer className="h-4 w-4 text-[#999]" />
          <span className="text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5] tabular-nums">{fmtTime(time)}</span>
          <span className="text-[11px] text-[#999]">Thời gian</span>
        </div>
        <div className="flex flex-col items-center gap-1 rounded-[8px] px-6 py-4"
          style={{ boxShadow: 'var(--shadow-card)' }}>
          <Zap className="h-4 w-4 text-[#999]" />
          <span className="text-[22px] font-bold text-[#171717] dark:text-[#f5f5f5] tabular-nums">{speed}s</span>
          <span className="text-[11px] text-[#999]">Mỗi cặp</span>
        </div>
      </div>

      <div className="flex gap-3 mt-2">
        <button onClick={onRetry}
          className="flex items-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] px-5 py-2.5 text-[13px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
          <RotateCcw className="h-3.5 w-3.5" /> Chơi lại
        </button>
        <button onClick={onBack}
          className="flex items-center gap-2 rounded-[8px] px-5 py-2.5 text-[13px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
          style={{ boxShadow: 'var(--shadow-border)' }}>
          <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
        </button>
      </div>
    </div>
  )
}

/* ─── Main game ──────────────────────────────────────────────── */
function MatchGame() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const topicId      = searchParams.get('topicId')
  const countParam   = parseInt(searchParams.get('count') ?? '8')

  const [cards, setCards]       = useState<MatchCard[]>([])
  const [tiles, setTiles]       = useState<Tile[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [loading, setLoading]   = useState(true)
  const [matched, setMatched]   = useState(0)
  const [elapsed, setElapsed]   = useState(0)
  const [running, setRunning]   = useState(false)
  const [done, setDone]         = useState(false)

  /* Load cards */
  const loadCards = useCallback(async () => {
    setLoading(true)
    setDone(false)
    setMatched(0)
    setElapsed(0)
    setSelected(null)
    setRunning(false)
    try {
      const qs = topicId ? `?topicId=${topicId}&count=${countParam}` : `?count=${countParam}`
      const res = await apiFetch<MatchCard[]>(`/api/match${qs}`)
      setCards(res)
      setTiles(buildTiles(res))
    } catch {
      toast.error('Không thể tải dữ liệu')
    } finally {
      setLoading(false)
    }
  }, [topicId, countParam])

  useEffect(() => { loadCards() }, [loadCards])

  /* Timer */
  useEffect(() => {
    if (!running || done) return
    const t = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => clearInterval(t)
  }, [running, done])

  /* Handle tile tap */
  const tapTile = useCallback((uid: string) => {
    setTiles(prev => {
      const tile = prev.find(t => t.uid === uid)
      if (!tile || tile.state === 'matched') return prev

      // Start timer on first tap
      setRunning(true)

      // If nothing selected → select this
      if (!selected) {
        setSelected(uid)
        return prev.map(t => t.uid === uid ? { ...t, state: 'selected' } : t)
      }

      // Same tile → deselect
      if (selected === uid) {
        setSelected(null)
        return prev.map(t => t.uid === uid ? { ...t, state: 'idle' } : t)
      }

      const selTile = prev.find(t => t.uid === selected)!
      const isMatch = selTile.phraseId === tile.phraseId && selTile.type !== tile.type

      if (isMatch) {
        // Flash green → mark matched
        const next = prev.map(t =>
          t.uid === uid || t.uid === selected ? { ...t, state: 'matched' as TileState } : t
        )
        setSelected(null)
        setMatched(m => {
          const newM = m + 1
          if (newM === cards.length) {
            setTimeout(() => setDone(true), 600)
            setRunning(false)
            toast.success(`Ghép xong ${newM} cặp trong ${fmtTime(elapsed)} 🏆`, { duration: 3000 })
          }
          return newM
        })
        return next
      } else {
        // Flash red → reset both after 600ms
        const next = prev.map(t =>
          t.uid === uid || t.uid === selected ? { ...t, state: 'wrong' as TileState } : t
        )
        setSelected(null)
        setTimeout(() => {
          setTiles(cur => cur.map(t =>
            t.state === 'wrong' ? { ...t, state: 'idle' } : t
          ))
        }, 600)
        return next
      }
    })
  }, [selected, cards.length])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex flex-col">
        <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
          style={{ boxShadow: 'var(--shadow-nav-bottom)' }}>
          <div className="mx-auto max-w-3xl px-4 h-14 flex items-center">
            <button onClick={() => router.back()}
              className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors">
              <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
            </button>
          </div>
        </header>
        <main className="flex-1">
          <MatchComplete
            time={elapsed}
            pairs={cards.length}
            onRetry={loadCards}
            onBack={() => router.back()}
          />
        </main>
      </div>
    )
  }

  const tileStyle: Record<TileState, string> = {
    idle:     'bg-white dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] hover:opacity-90 cursor-pointer',
    selected: 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] cursor-pointer scale-[0.97]',
    matched:  'bg-emerald-50 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 opacity-60 pointer-events-none',
    wrong:    'bg-red-50 dark:bg-red-950 text-red-600 dark:text-red-400 scale-[0.97]',
  }

  const progress = cards.length > 0 ? (matched / cards.length) * 100 : 0

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'var(--shadow-nav-bottom)' }}>
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>

          <div className="flex items-center gap-4">
            {/* Timer */}
            <div className="flex items-center gap-1.5 tabular-nums text-[13px] font-medium text-[#666]">
              <Timer className="h-3.5 w-3.5" />
              {fmtTime(elapsed)}
            </div>
            {/* Progress */}
            <div className="flex items-center gap-1.5 text-[13px] text-[#666]">
              <Trophy className="h-3.5 w-3.5" />
              {matched}/{cards.length}
            </div>
          </div>
        </div>

        {/* Progress bar */}
        <div className="h-0.5 bg-[#f0f0f0] dark:bg-[#222]">
          <div className="h-full bg-emerald-500 transition-all duration-500"
            style={{ width: `${progress}%` }} />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">

        {/* Title */}
        <div className="mb-6 text-center">
          <h1 className="text-[20px] font-bold text-[#171717] dark:text-[#f5f5f5] tracking-tight">
            Match
          </h1>
          <p className="text-[13px] text-[#999] mt-1">Ghép câu tiếng Anh với nghĩa tiếng Việt tương ứng</p>
        </div>

        {/* Tile grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
          {tiles.map(tile => (
            <button
              key={tile.uid}
              onClick={() => tapTile(tile.uid)}
              className={cn(
                'rounded-[8px] px-3 py-4 text-[13px] font-medium text-left leading-snug transition-all duration-150 active:scale-95',
                tileStyle[tile.state]
              )}
              style={{
                boxShadow: tile.state === 'selected' ? 'none' : 'var(--shadow-card)',
                minHeight: '80px',
              }}
            >
              {tile.text}
            </button>
          ))}
        </div>

        {/* Hint */}
        <p className="text-center text-[11px] text-[#bbb] mt-8">
          Nhấn một thẻ tiếng Anh rồi nhấn thẻ nghĩa tiếng Việt tương ứng để ghép đôi
        </p>
      </main>
    </div>
  )
}

export default function MatchPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
      </div>
    }>
      <MatchGame />
    </Suspense>
  )
}
