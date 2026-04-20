'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'
import { getXP, getLevelFromXP, getBadge } from '@/lib/xp'

interface XPBarProps {
  className?: string
  compact?: boolean   // small inline badge (header)
}

export function XPBar({ className, compact = false }: XPBarProps) {
  const [xpData, setXPData] = useState(() => {
    const total = typeof window !== 'undefined' ? getXP() : 0
    return { total, ...getLevelFromXP(total), badge: getBadge(getLevelFromXP(total).level) }
  })

  // Refresh when window gets focus (in case XP changed in another tab/page)
  useEffect(() => {
    function refresh() {
      const total = getXP()
      const lvl   = getLevelFromXP(total)
      setXPData({ total, ...lvl, badge: getBadge(lvl.level) })
    }
    refresh()
    window.addEventListener('focus', refresh)
    // Also listen to storage events (cross-tab)
    window.addEventListener('storage', refresh)
    return () => { window.removeEventListener('focus', refresh); window.removeEventListener('storage', refresh) }
  }, [])

  if (compact) {
    return (
      <div className={cn('flex items-center gap-1.5', className)}>
        <span className="text-base leading-none">{xpData.badge.emoji}</span>
        <div>
          <span className="text-[11px] font-bold text-[#171717] dark:text-[#f5f5f5]">
            Lv.{xpData.level}
          </span>
          <div className="h-1 w-12 rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] overflow-hidden mt-0.5">
            <div
              className="h-full rounded-full bg-amber-400 transition-all duration-700"
              style={{ width: `${xpData.progress}%` }}
              suppressHydrationWarning
            />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className={cn('rounded-[8px] bg-white dark:bg-[#111] p-5', className)}
      style={{ boxShadow: 'var(--shadow-card)' }}>
      {/* Label */}
      <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] mb-4">
        XP & Level
      </p>

      {/* Level + Badge */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-50 dark:bg-amber-900/20 text-2xl">
          {xpData.badge.emoji}
        </div>
        <div>
          <p className="text-[18px] font-bold text-[#171717] dark:text-[#f5f5f5] leading-tight">
            Level {xpData.level} — {xpData.badge.title}
          </p>
          <p className="text-[12px] text-[#999]">
            {xpData.total.toLocaleString()} XP tổng
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div>
        <div className="flex justify-between mb-1.5">
          <span className="text-[11px] text-[#999]">{xpData.currentXP} XP</span>
          <span className="text-[11px] text-[#999]">{xpData.nextXP} XP để lên level</span>
        </div>
        <div className="h-2 rounded-full bg-[#f0f0f0] dark:bg-[#2a2a2a] overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500 transition-all duration-700"
            style={{ width: `${xpData.progress}%` }}
          />
        </div>
        <p className="text-[11px] text-[#bbb] mt-1.5 text-right">{xpData.progress}%</p>
      </div>
    </div>
  )
}

// Re-export from lib/xp for backward compat (the real impl lives there)
export { xpToastMessage } from '@/lib/xp'
