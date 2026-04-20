'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'

interface CalendarDay {
  date: string   // "2025-04-20"
  count: number
}

function getIntensity(count: number): number {
  if (count === 0) return 0
  if (count <= 5)  return 1
  if (count <= 15) return 2
  if (count <= 30) return 3
  return 4
}

const INTENSITY_CLASS = [
  'bg-[#f0f0f0] dark:bg-[#2a2a2a]',                               // 0: empty
  'bg-sky-100 dark:bg-sky-900/40',                                  // 1: light
  'bg-sky-300 dark:bg-sky-700/60',                                  // 2: medium
  'bg-sky-500 dark:bg-sky-500/80',                                  // 3: heavy
  'bg-sky-700 dark:bg-sky-400',                                     // 4: intense
]

const DOW = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7']
const MONTHS = ['T1','T2','T3','T4','T5','T6','T7','T8','T9','T10','T11','T12']

export function ReviewCalendar() {
  const router = useRouter()
  const [days, setDays]     = useState<CalendarDay[]>([])
  const [loading, setLoading] = useState(true)
  const [tooltip, setTooltip] = useState<{ date: string; count: number; x: number; y: number } | null>(null)

  useEffect(() => {
    apiFetch<{ calendar: CalendarDay[] }>('/api/review/calendar')
      .then(d => setDays(d.calendar))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const total = days.reduce((s, d) => s + d.count, 0)
  const busiest = days.reduce((max, d) => d.count > max.count ? d : max, { date: '', count: 0 })

  function formatDate(iso: string) {
    const d = new Date(iso + 'T00:00:00')
    return `${d.getDate()}/${d.getMonth() + 1}`
  }

  function isToday(iso: string) {
    return iso === new Date().toISOString().slice(0, 10)
  }

  return (
    <div className="rounded-[8px] bg-white dark:bg-[#111] p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-4">
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
          Lịch ôn tập — 30 ngày tới
        </p>
        {total > 0 && (
          <span className="text-[11px] text-[#999]">
            {total} câu sắp đến hạn
          </span>
        )}
      </div>

      {loading ? (
        <div className="grid grid-cols-7 gap-1">
          {[...Array(30)].map((_, i) => (
            <div key={i} className="h-7 rounded-[4px] bg-[#f0f0f0] dark:bg-[#2a2a2a] animate-pulse" />
          ))}
        </div>
      ) : days.length === 0 ? (
        <p className="text-[13px] text-[#999] text-center py-4">Không có dữ liệu</p>
      ) : (
        <>
          {/* Day of week header */}
          <div className="grid grid-cols-7 gap-1 mb-1">
            {DOW.map(d => (
              <div key={d} className="text-center text-[9px] text-[#bbb] dark:text-[#555] font-medium">{d}</div>
            ))}
          </div>

          {/* Calendar grid — pad start to align with day of week */}
          {(() => {
            if (days.length === 0) return null
            const firstDow = new Date(days[0].date + 'T00:00:00').getDay() // 0=Sun
            const padded: (CalendarDay | null)[] = [
              ...Array(firstDow).fill(null),
              ...days,
            ]
            return (
              <div className="grid grid-cols-7 gap-1">
                {padded.map((day, i) =>
                  day === null ? (
                    <div key={`pad-${i}`} />
                  ) : (
                    <button
                      key={day.date}
                      onClick={() => day.count > 0 && router.push('/review')}
                      onMouseEnter={e => {
                        const rect = (e.target as HTMLElement).getBoundingClientRect()
                        setTooltip({ date: day.date, count: day.count, x: rect.left, y: rect.top })
                      }}
                      onMouseLeave={() => setTooltip(null)}
                      className={cn(
                        'h-7 rounded-[4px] transition-all',
                        INTENSITY_CLASS[getIntensity(day.count)],
                        day.count > 0 ? 'cursor-pointer hover:opacity-80 hover:scale-110' : 'cursor-default',
                        isToday(day.date) && 'ring-2 ring-[#171717] dark:ring-[#f5f5f5] ring-offset-1',
                      )}
                      title={`${formatDate(day.date)}: ${day.count} câu`}
                    />
                  )
                )}
              </div>
            )
          })()}

          {/* Legend + summary */}
          <div className="flex items-center justify-between mt-3">
            <div className="flex items-center gap-1">
              <span className="text-[9px] text-[#bbb]">Ít</span>
              {INTENSITY_CLASS.map((cls, i) => (
                <div key={i} className={cn('h-3 w-3 rounded-[2px]', cls)} />
              ))}
              <span className="text-[9px] text-[#bbb]">Nhiều</span>
            </div>
            {busiest.count > 0 && (
              <p className="text-[10px] text-[#999]">
                Bận nhất: <span className="font-medium text-[#555] dark:text-[#888]">{formatDate(busiest.date)}</span> ({busiest.count})
              </p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
