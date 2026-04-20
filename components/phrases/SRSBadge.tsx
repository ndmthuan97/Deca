'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { Brain, Calendar, RotateCcw, TrendingUp, Clock } from 'lucide-react'
import type { Phrase } from '@/db/schema'

type SRSPhrase = Pick<Phrase,
  | 'ease_factor' | 'review_interval' | 'repetitions' | 'next_review_at'
>

interface SRSBadgeProps {
  phrase: SRSPhrase
  className?: string
}

function formatRelativeDate(date: Date | string | null): string {
  if (!date) return 'Chưa ôn'
  const d = new Date(date)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24))

  if (diffDays < 0)  return `Quá hạn ${Math.abs(diffDays)} ngày`
  if (diffDays === 0) return 'Hôm nay'
  if (diffDays === 1) return 'Ngày mai'
  return `${diffDays} ngày nữa`
}

function getMasteryLabel(repetitions: number): { label: string; color: string } {
  if (repetitions === 0) return { label: 'Chưa học',  color: 'text-[#bbb]' }
  if (repetitions === 1) return { label: 'Mới học',   color: 'text-orange-400' }
  if (repetitions === 2) return { label: 'Đang học',  color: 'text-amber-500' }
  if (repetitions <= 4)  return { label: 'Khá thuộc', color: 'text-sky-500' }
  if (repetitions <= 7)  return { label: 'Thuộc',     color: 'text-emerald-500' }
  return                        { label: 'Thành thạo',color: 'text-emerald-600' }
}

/**
 * Inline SRS detail badge — shows a small indicator dot.
 * On hover/click reveals full SRS stats in a floating panel.
 */
export function SRSBadge({ phrase, className }: SRSBadgeProps) {
  const [open, setOpen] = useState(false)
  const { label, color } = getMasteryLabel(phrase.repetitions ?? 0)
  const efPct = Math.round(((phrase.ease_factor ?? 2.5) - 1.3) / (2.5 - 1.3) * 100)

  return (
    <div className={cn('relative inline-flex', className)}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className={cn(
          'flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium transition-all',
          'bg-[#f5f5f5] dark:bg-[#222] hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a]',
          color,
        )}
        title="Xem thông tin SRS"
      >
        <Brain className="h-2.5 w-2.5 shrink-0" />
        <span>{label}</span>
      </button>

      {open && (
        <>
          {/* Backdrop */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          {/* Panel */}
          <div
            className="absolute left-0 top-full mt-1 z-50 w-56 rounded-[8px] bg-white dark:bg-[#1a1a1a] p-3 space-y-2.5"
            style={{ boxShadow: 'rgba(0,0,0,0.12) 0px 4px 16px, rgba(0,0,0,0.06) 0px 0px 0px 1px' }}
            onClick={e => e.stopPropagation()}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-[#666] dark:text-[#888]">
              SRS Stats
            </p>

            {/* Mastery level */}
            <div className="flex items-center justify-between">
              <span className="text-[12px] text-[#666] dark:text-[#888]">Mức độ</span>
              <span className={cn('text-[12px] font-semibold', color)}>{label}</span>
            </div>

            {/* Repetitions */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[12px] text-[#666] dark:text-[#888]">
                <RotateCcw className="h-3 w-3" />
                <span>Số lần đúng</span>
              </div>
              <span className="text-[12px] font-mono font-semibold text-[#171717] dark:text-[#f5f5f5]">
                {phrase.repetitions ?? 0}×
              </span>
            </div>

            {/* Ease factor */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1 text-[12px] text-[#666] dark:text-[#888]">
                  <TrendingUp className="h-3 w-3" />
                  <span>Ease factor</span>
                </div>
                <span className="text-[12px] font-mono font-semibold text-[#171717] dark:text-[#f5f5f5]">
                  {(phrase.ease_factor ?? 2.5).toFixed(2)}
                </span>
              </div>
              <div className="h-1 rounded-full bg-[#f0f0f0] dark:bg-[#333] overflow-hidden">
                <div
                  className={cn(
                    'h-full rounded-full transition-all',
                    efPct >= 70 ? 'bg-emerald-500' : efPct >= 40 ? 'bg-amber-400' : 'bg-red-400'
                  )}
                  style={{ width: `${efPct}%` }}
                />
              </div>
              <p className="text-[9px] text-[#bbb] mt-0.5">1.3 (khó) → 2.5 (dễ)</p>
            </div>

            {/* Review interval */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1 text-[12px] text-[#666] dark:text-[#888]">
                <Clock className="h-3 w-3" />
                <span>Interval</span>
              </div>
              <span className="text-[12px] font-mono font-semibold text-[#171717] dark:text-[#f5f5f5]">
                {phrase.review_interval ?? 0} ngày
              </span>
            </div>

            {/* Next review */}
            <div className="flex items-center justify-between pt-1 border-t border-[#f0f0f0] dark:border-[#2a2a2a]">
              <div className="flex items-center gap-1 text-[12px] text-[#666] dark:text-[#888]">
                <Calendar className="h-3 w-3" />
                <span>Ôn tiếp</span>
              </div>
              <span className={cn(
                'text-[12px] font-medium',
                formatRelativeDate(phrase.next_review_at ?? null).startsWith('Quá hạn')
                  ? 'text-red-500'
                  : 'text-[#171717] dark:text-[#f5f5f5]'
              )}>
                {formatRelativeDate(phrase.next_review_at ?? null)}
              </span>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
