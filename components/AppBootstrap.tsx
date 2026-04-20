'use client'

/**
 * AppBootstrap — mounts invisible client-side effects:
 *   1. Auto theme (time-based dark mode)
 *   2. Daily notification scheduler
 *
 * Render once inside the root layout, inside <body>.
 */

import { useEffect } from 'react'
import { getSettings } from '@/lib/settings'
import { scheduleDailyReminder, clearDailyReminder } from '@/lib/notifications'

function applyAutoTheme() {
  const s = getSettings()
  if (s.theme !== 'auto') return

  const hour = new Date().getHours()
  const { autoThemeDarkFrom: from, autoThemeDarkTo: to } = s

  // Dark when: hour >= from OR hour < to
  const isDark = from > to
    ? (hour >= from || hour < to)   // overnight range: e.g. 19→7
    : (hour >= from && hour < to)   // same-day range  (edge case)

  document.documentElement.classList.toggle('dark', isDark)
}

export function AppBootstrap() {
  useEffect(() => {
    // ── 1. Auto theme ────────────────────────────────────────────
    applyAutoTheme()
    // Re-check every minute so it switches right at the boundary hour
    const themeTimer = setInterval(applyAutoTheme, 60_000)

    // ── 2. Notifications ─────────────────────────────────────────
    const s = getSettings()
    if (s.notificationsEnabled) {
      scheduleDailyReminder(s.notificationHour)
    } else {
      clearDailyReminder()
    }

    return () => clearInterval(themeTimer)
  }, [])

  return null
}
