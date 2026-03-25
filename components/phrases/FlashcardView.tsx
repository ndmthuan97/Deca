'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Volume2, BookOpen, Settings, Shuffle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Phrase } from '@/db/schema'

function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }
}

function FlashcardTypeBadges({ type, functionText }: { type: string; functionText?: string | null }) {
  const [tipOpen, setTipOpen] = useState(false)
  const types = type.split(',').map(t => t.trim()).filter(Boolean)
  return (
    <div
      className="mb-3 flex flex-wrap justify-center gap-1 relative group"
      onClick={e => { e.stopPropagation(); if (functionText) setTipOpen(v => !v) }}
      onMouseLeave={() => setTipOpen(false)}
    >
      {types.map(t => (
        <span key={t} className="rounded-full bg-orange-50 dark:bg-orange-900/30 px-2 py-0.5 text-[11px] font-medium text-orange-500 dark:text-orange-300 border border-orange-100 dark:border-orange-800 cursor-default">
          {t}
        </span>
      ))}
      {functionText && (
        <>
          {/* Desktop: hover */}
          <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-64 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-xl hidden md:block opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {functionText}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900" />
          </div>
          {/* Mobile: tap */}
          {tipOpen && (
            <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-64 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-xl md:hidden">
              {functionText}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Keybinding system ── */
type ActionId = 'prev' | 'next' | 'speak' | 'example1' | 'example2' | 'random'

interface KeyBinding { id: ActionId; label: string; key: string }

const DEFAULT_BINDINGS: KeyBinding[] = [
  { id: 'prev', label: 'Trước', key: 'ArrowLeft' },
  { id: 'next', label: 'Sau', key: 'ArrowRight' },
  { id: 'speak', label: 'Đọc câu', key: ' ' },
  { id: 'example1', label: 'Đọc VD1', key: '1' },
  { id: 'example2', label: 'Đọc VD2', key: '2' },
  { id: 'random', label: 'Ngẫu nhiên', key: 'r' },
]

const STORAGE_KEY = 'flashcard-keybindings'

function loadBindings(): KeyBinding[] {
  if (typeof window === 'undefined') return DEFAULT_BINDINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BINDINGS
    const saved = JSON.parse(raw) as Record<string, string>
    return DEFAULT_BINDINGS.map(b => ({ ...b, key: saved[b.id] ?? b.key }))
  } catch { return DEFAULT_BINDINGS }
}

function saveBindings(bindings: KeyBinding[]) {
  const map: Record<string, string> = {}
  bindings.forEach(b => { map[b.id] = b.key })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function keyDisplayName(key: string): string {
  if (key === ' ') return 'Space'
  if (key === 'ArrowLeft') return '←'
  if (key === 'ArrowRight') return '→'
  if (key === 'ArrowUp') return '↑'
  if (key === 'ArrowDown') return '↓'
  return key.length === 1 ? key.toUpperCase() : key
}

interface FlashcardViewProps { phrases: Phrase[] }

export function FlashcardView({ phrases }: FlashcardViewProps) {
  const [index, setIndex] = useState(0)
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [bindings, setBindings] = useState<KeyBinding[]>(DEFAULT_BINDINGS)
  const [capturingId, setCapturingId] = useState<ActionId | null>(null)
  const [shuffleOn, setShuffleOn] = useState(false)
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => { setBindings(loadBindings()) }, [])
  useEffect(() => { setIndex(0) }, [phrases])

  // Fisher-Yates shuffle with seed-based trigger
  const orderedPhrases = useMemo(() => {
    if (!shuffleOn) return phrases
    const arr = [...phrases]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrases, shuffleOn, shuffleSeed])

  const current = orderedPhrases[index]
  const total = orderedPhrases.length

  const keyFor = useCallback((id: ActionId) => bindings.find(b => b.id === id)?.key ?? '', [bindings])

  const goPrev = useCallback(() => {
    if (index === 0) return
    setSwipeDir('right')
    setTimeout(() => { setIndex(i => i - 1); setSwipeDir(null) }, 150)
  }, [index])

  const goNext = useCallback(() => {
    if (index === total - 1) return
    setSwipeDir('left')
    setTimeout(() => { setIndex(i => i + 1); setSwipeDir(null) }, 150)
  }, [index, total])

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (capturingId) return // ignore while capturing
      const k = e.key
      if (k === keyFor('prev')) goPrev()
      if (k === keyFor('next')) goNext()
      if (k === keyFor('speak')) { e.preventDefault(); speak(orderedPhrases[index]?.sample_sentence ?? '') }
      if (k === keyFor('example1') && orderedPhrases[index]?.example1) speak(orderedPhrases[index].example1!)
      if (k === keyFor('example2') && orderedPhrases[index]?.example2) speak(orderedPhrases[index].example2!)
      if (k.toLowerCase() === keyFor('random').toLowerCase()) { setIndex(Math.floor(Math.random() * orderedPhrases.length)) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext, index, orderedPhrases, keyFor, capturingId])

  // Key capture for settings
  useEffect(() => {
    if (!capturingId) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key === 'Escape') { setCapturingId(null); return }
      const updated = bindings.map(b => b.id === capturingId ? { ...b, key: e.key } : b)
      setBindings(updated)
      saveBindings(updated)
      setCapturingId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [capturingId, bindings])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      dx < 0 ? goNext() : goPrev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 rounded-full bg-gray-100 dark:bg-gray-800 p-5">
          <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm text-gray-400">Không có câu nào phù hợp với bộ lọc</p>
      </div>
    )
  }

  const examples = [
    { sentence: current.example1, translation: current.example1_translation, pronunciation: current.example1_pronunciation, n: 1 },
    { sentence: current.example2, translation: current.example2_translation, pronunciation: current.example2_pronunciation, n: 2 },
  ].filter(e => e.sentence)

  const progress = ((index + 1) / total) * 100

  return (
    <div className="flex flex-col items-center gap-5 py-6 px-4">

      {/* ── Progress + Shuffle ── */}
      <div className="w-full max-w-lg flex items-center gap-3">
        <button
          onClick={() => { setShuffleOn(v => !v); setShuffleSeed(s => s + 1); setIndex(0) }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg border transition-colors shrink-0',
            shuffleOn
              ? 'border-orange-300 bg-orange-50 text-orange-500 dark:border-orange-700 dark:bg-orange-900/30 dark:text-orange-400'
              : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-gray-300'
          )}
          title={shuffleOn ? 'Tắt xáo trộn' : 'Xáo trộn'}
        >
          <Shuffle className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-400 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums shrink-0">
          <span className="font-semibold text-gray-600 dark:text-gray-300">{index + 1}</span>/{total}
        </span>
      </div>

      {/* ── Card ── */}
      <div className="w-full max-w-lg">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm select-none"
          style={{
            transform: swipeDir === 'left' ? 'translateX(-6px)' : swipeDir === 'right' ? 'translateX(6px)' : 'none',
            opacity: swipeDir ? 0.75 : 1,
            transition: 'transform 150ms ease, opacity 150ms ease',
          }}
        >
          {/* ── Header: title + type ── */}
          <div className="flex items-center justify-between px-5 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-400/70 dark:text-gray-500/70">Câu mẫu</p>
            <FlashcardTypeBadges type={current.type ?? ''} functionText={current.function} />
          </div>

          {/* ── Câu mẫu + phiên âm + nghĩa ── */}
          <div className="rounded-xl bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800 p-4 mx-5 mt-1.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{current.sample_sentence}</p>
                {current.pronunciation && (
                  <p className="font-mono text-sm text-orange-500 dark:text-orange-400 mt-0.5">{current.pronunciation}</p>
                )}
                {current.translation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">{current.translation}</p>
                )}
              </div>
              <button onClick={() => speak(current.sample_sentence)} className="text-orange-400 hover:text-orange-600 shrink-0 mt-1">
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Cấu trúc ngữ pháp ── */}
          {current.structure && (
            <div className="mx-5 mt-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400/70 dark:text-gray-500/70 mb-1.5">Cấu trúc</p>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm leading-relaxed font-mono">
                  {current.structure.split(/(\([^)]+\))/g).map((part: string, i: number) =>
                    part.startsWith('(') && part.endsWith(')') ? (
                      <span key={i} className="text-orange-500 dark:text-orange-400 font-semibold">{part}</span>
                    ) : (
                      <span key={i} className="text-gray-700 dark:text-gray-300">{part}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── Ví dụ ── */}
          {examples.length > 0 && (
            <div className="px-5 pt-2 pb-4 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400/70 dark:text-gray-500/70">Ví dụ</p>
              {examples.map(ex => (
                <div key={ex.n} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 dark:bg-orange-900/40 text-[9px] font-bold text-orange-500 dark:text-orange-300 shrink-0">{ex.n}</span>
                    <p className="text-sm text-gray-800 dark:text-gray-200 italic flex-1 min-w-0">{ex.sentence}</p>
                    <button onClick={() => speak(ex.sentence!)} className="text-gray-400 hover:text-orange-500 shrink-0">
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {ex.translation && <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">{ex.translation}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Navigation ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {total <= 9 ? (
            [...Array(total)].map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === index ? 'w-4 h-2 bg-orange-400' : 'w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                )}
              />
            ))
          ) : (
            <span className="text-xs text-gray-400 font-medium tabular-nums px-1">
              {index + 1} / {total}
            </span>
          )}
        </div>

        <button
          onClick={goNext}
          disabled={index === total - 1}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Hint bar desktop */}
      <div className="hidden md:flex items-center justify-center gap-3 text-[10px] text-gray-400 dark:text-gray-600">
        {bindings.map(b => (
          <span key={b.id} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono">{keyDisplayName(b.key)}</kbd>
            {b.label}
          </span>
        ))}
        <button
          onClick={() => setShowSettings(v => !v)}
          className="ml-1 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Cài đặt phím tắt"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Settings className="h-4 w-4 text-orange-500" />
              Cài đặt phím tắt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {bindings.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{b.label}</span>
                <button
                  onClick={() => setCapturingId(b.id)}
                  className={cn(
                    'min-w-[72px] px-3 py-1.5 rounded-lg border text-sm font-mono text-center transition-colors',
                    capturingId === b.id
                      ? 'border-orange-400 bg-orange-50 dark:bg-orange-900/20 text-orange-600 animate-pulse'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  )}
                >
                  {capturingId === b.id ? 'Nhấn phím...' : keyDisplayName(b.key)}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 italic">Nhấn vào ô → bấm phím mới • Esc để hủy</p>
            <button
              onClick={() => { setBindings(DEFAULT_BINDINGS); saveBindings(DEFAULT_BINDINGS) }}
              className="text-xs text-orange-500 hover:text-orange-600 font-medium"
            >Mặc định</button>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-[11px] text-gray-300 dark:text-gray-700 md:hidden">Vuốt để chuyển</p>
    </div>
  )
}
