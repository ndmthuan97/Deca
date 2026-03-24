'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Volume2, Eye, EyeOff, BookOpen } from 'lucide-react'
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

interface FlashcardViewProps {
  phrases: Phrase[]
}

export function FlashcardView({ phrases }: FlashcardViewProps) {
  const [index, setIndex] = useState(0)
  const [showDetail, setShowDetail] = useState(false)

  // Reset khi danh sách thay đổi (do filter)
  useEffect(() => {
    setIndex(0)
    setShowDetail(false)
  }, [phrases])

  const current = phrases[index]
  const total = phrases.length

  const goPrev = useCallback(() => {
    setIndex(i => Math.max(0, i - 1))
    setShowDetail(false)
  }, [])

  const goNext = useCallback(() => {
    setIndex(i => Math.min(total - 1, i + 1))
    setShowDetail(false)
  }, [total])

  // Keyboard shortcut: ← →
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') goPrev()
      if (e.key === 'ArrowRight') goNext()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext])

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 rounded-full bg-gray-100 p-5">
          <BookOpen className="h-8 w-8 text-gray-300" />
        </div>
        <p className="text-sm text-gray-400">Không có câu nào phù hợp với bộ lọc</p>
      </div>
    )
  }

  const examples = [
    { sentence: current.example1, translation: current.example1_translation, n: 1 },
    { sentence: current.example2, translation: current.example2_translation, n: 2 },
  ].filter(e => e.sentence)

  return (
    <div className="flex flex-col items-center gap-6 py-6 md:py-10 px-4">
      {/* Progress bar */}
      <div className="w-full max-w-xl">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-xs text-gray-400">
            <span className="font-semibold text-gray-600">{index + 1}</span> / {total}
          </span>
          <span className="text-xs text-gray-400">
            {Math.round(((index + 1) / total) * 100)}%
          </span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-full rounded-full bg-orange-400 transition-all duration-300"
            style={{ width: `${((index + 1) / total) * 100}%` }}
          />
        </div>
      </div>

      {/* Flashcard */}
      <div className="w-full max-w-xl">
        <div className="rounded-2xl border border-gray-200 bg-white shadow-md overflow-hidden">
          {/* Front: câu mẫu */}
          <div className="px-8 py-10 text-center">
            {/* Type badge */}
            {current.type && (
              <div className="mb-4 flex flex-wrap justify-center gap-1.5">
                {current.type.split(',').map(t => t.trim()).filter(Boolean).map(t => (
                  <span key={t} className="rounded-full bg-orange-50 px-2.5 py-0.5 text-xs font-medium text-orange-600 border border-orange-100">
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Câu mẫu */}
            <h2 className="text-xl md:text-2xl font-bold text-gray-900 leading-snug mb-3">
              {current.sample_sentence}
            </h2>

            {/* Phiên âm */}
            {current.pronunciation && (
              <p className="font-mono text-sm text-orange-500 mb-4">
                {current.pronunciation}
              </p>
            )}

            {/* Nút nghe */}
            <button
              onClick={() => speak(current.sample_sentence)}
              className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-gray-50 px-3 py-1.5 text-xs text-gray-500 hover:bg-blue-50 hover:text-blue-600 hover:border-blue-200 transition-colors"
            >
              <Volume2 className="h-3.5 w-3.5" />
              Nghe phát âm
            </button>
          </div>

          {/* Divider */}
          <div className="border-t border-gray-100" />

          {/* Detail section */}
          <div className="px-6 py-4">
            <button
              onClick={() => setShowDetail(v => !v)}
              className={cn(
                'flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-medium transition-colors',
                showDetail
                  ? 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  : 'bg-orange-50 text-orange-700 hover:bg-orange-100 border border-orange-100'
              )}
            >
              {showDetail ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              {showDetail ? 'Ẩn chi tiết' : 'Xem nghĩa & ví dụ'}
            </button>

            {showDetail && (
              <div className="mt-4 space-y-4">
                {/* Dịch nghĩa */}
                {current.translation && (
                  <div className="rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-blue-400 mb-1">Dịch nghĩa</p>
                    <p className="text-sm font-medium text-blue-900">{current.translation}</p>
                  </div>
                )}

                {/* Ví dụ */}
                {examples.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">Ví dụ</p>
                    {examples.map(ex => (
                      <div key={ex.n} className="rounded-xl bg-gray-50 border border-gray-100 px-4 py-3">
                        <div className="flex items-start gap-2">
                          <span className="shrink-0 mt-0.5 text-[10px] font-bold text-gray-300">VD{ex.n}</span>
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-1.5">
                              <p className="text-sm text-gray-700 italic">{ex.sentence}</p>
                              <button
                                onClick={() => speak(ex.sentence!)}
                                className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"
                              >
                                <Volume2 className="h-3 w-3" />
                              </button>
                            </div>
                            {ex.translation && (
                              <p className="text-xs text-gray-400 mt-0.5">{ex.translation}</p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex items-center gap-3">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
          title="Câu trước (←)"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        {/* Dot indicators (tối đa 7 dots) */}
        <div className="flex items-center gap-1.5">
          {total <= 7 ? (
            [...Array(total)].map((_, i) => (
              <button
                key={i}
                onClick={() => { setIndex(i); setShowDetail(false) }}
                className={cn(
                  'rounded-full transition-all',
                  i === index ? 'w-4 h-2 bg-orange-500' : 'w-2 h-2 bg-gray-200 hover:bg-gray-300'
                )}
              />
            ))
          ) : (
            <span className="text-sm text-gray-500 font-medium px-2">
              {index + 1} / {total}
            </span>
          )}
        </div>

        <button
          onClick={goNext}
          disabled={index === total - 1}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors shadow-sm"
          title="Câu tiếp (→)"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      </div>

      <p className="text-xs text-gray-300">Dùng phím ← → để điều hướng</p>
    </div>
  )
}
