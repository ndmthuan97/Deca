'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { ChevronLeft, ChevronRight, Volume2, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'
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

interface FlashcardViewProps {
  phrases: Phrase[]
}

export function FlashcardView({ phrases }: FlashcardViewProps) {
  const [index, setIndex] = useState(0)
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => { setIndex(0) }, [phrases])

  const current = phrases[index]
  const total = phrases.length

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

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext])

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
    { sentence: current.example1, translation: current.example1_translation, n: 1 },
    { sentence: current.example2, translation: current.example2_translation, n: 2 },
  ].filter(e => e.sentence)

  const progress = ((index + 1) / total) * 100

  return (
    <div className="flex flex-col items-center gap-5 py-6 px-4">

      {/* ── Progress ── */}
      <div className="w-full max-w-lg flex items-center gap-3">
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
          className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden select-none"
          style={{
            transform: swipeDir === 'left' ? 'translateX(-6px)' : swipeDir === 'right' ? 'translateX(6px)' : 'none',
            opacity: swipeDir ? 0.75 : 1,
            transition: 'transform 150ms ease, opacity 150ms ease',
          }}
        >
          {/* ── Top: Câu + nghĩa ── */}
          <div className="px-6 pt-8 pb-6 text-center">
            {/* Type badges + function tooltip */}
            {current.type && (
              <FlashcardTypeBadges type={current.type} functionText={current.function} />
            )}

            {/* Câu mẫu */}
            <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 leading-snug">
              {current.sample_sentence}
            </h2>

            {/* Phiên âm */}
            {current.pronunciation && (
              <p className="mt-1.5 font-mono text-sm text-orange-400">{current.pronunciation}</p>
            )}

            {/* Cấu trúc câu */}
            {current.structure && (
              <p className="mt-2 text-xs text-blue-500 dark:text-blue-400 font-mono bg-blue-50 dark:bg-blue-900/20 rounded-lg px-3 py-1.5 inline-block">
                {current.structure}
              </p>
            )}

            {/* Nghĩa */}
            {current.translation && (
              <p className="mt-3 text-sm text-gray-500 dark:text-gray-400">{current.translation}</p>
            )}

            {/* Nghe */}
            <button
              onClick={() => speak(current.sample_sentence)}
              className="mt-4 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-1.5 text-xs text-gray-400 dark:text-gray-500 hover:text-blue-500 hover:border-blue-200 dark:hover:border-blue-700 hover:bg-blue-50 dark:hover:bg-blue-900/20 transition-colors"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Nghe
            </button>
          </div>

          {/* ── Bottom: Ví dụ ── */}
          {examples.length > 0 && (
            <>
              <div className="border-t border-gray-100 dark:border-gray-800" />
              <div className="px-6 py-4 space-y-3">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-300 dark:text-gray-600">Ví dụ</p>
                {examples.map(ex => (
                  <div key={ex.n} className="space-y-0.5">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-gray-700 dark:text-gray-300 italic leading-relaxed">{ex.sentence}</p>
                        {ex.translation && (
                          <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{ex.translation}</p>
                        )}
                      </div>
                      <button
                        onClick={() => speak(ex.sentence!)}
                        className="shrink-0 mt-0.5 text-gray-300 dark:text-gray-600 hover:text-blue-400 transition-colors"
                      >
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </>
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

      <p className="text-[11px] text-gray-300 dark:text-gray-700">Vuốt hoặc dùng ← → để chuyển</p>
    </div>
  )
}
