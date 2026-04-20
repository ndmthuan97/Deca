/**
 * XP & Level System — localStorage-based, single user
 *
 * XP per review result:
 *   easy  = 10 xp
 *   good  =  7 xp
 *   hard  =  4 xp
 *   again =  1 xp
 *
 * Level thresholds use a progressive curve:
 *   lvl 1 = 0–99 xp
 *   lvl 2 = 100–249 xp
 *   lvl n = sum(n-1) * 1.5
 */

const XP_KEY   = 'dace:xp'
const XP_TOTAL_KEY = 'dace:xp-total'

export const XP_PER_RESULT: Record<string, number> = {
  easy:  10,
  good:   7,
  hard:   4,
  again:  1,
}

/* ── Level thresholds ──────────────────────────────────────────── */
const LEVEL_THRESHOLDS = (() => {
  const t: number[] = [0]           // lvl 1 starts at 0
  let needed = 100
  for (let i = 1; i < 50; i++) {
    t.push(t[i - 1] + Math.round(needed))
    needed = Math.round(needed * 1.4)
  }
  return t
})()

export function getLevelFromXP(totalXP: number): {
  level: number
  currentXP: number
  nextXP: number
  progress: number   // 0–100 %
} {
  let level = 1
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (totalXP >= LEVEL_THRESHOLDS[i]) { level = i + 1; break }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1]
  const nextThreshold    = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[level - 1] + 9999
  const currentXP  = totalXP - currentThreshold
  const nextXP     = nextThreshold - currentThreshold
  const progress   = Math.min(100, Math.round((currentXP / nextXP) * 100))
  return { level, currentXP, nextXP, progress }
}

/* ── Persistence ───────────────────────────────────────────────── */
export function getXP(): number {
  if (typeof window === 'undefined') return 0
  return parseInt(localStorage.getItem(XP_TOTAL_KEY) ?? '0', 10)
}

export function addXP(result: string): { gained: number; total: number; leveledUp: boolean; newLevel: number } {
  const gained  = XP_PER_RESULT[result] ?? 0
  const oldTotal = getXP()
  const newTotal = oldTotal + gained

  const oldLevel = getLevelFromXP(oldTotal).level
  const newLevel = getLevelFromXP(newTotal).level
  const leveledUp = newLevel > oldLevel

  localStorage.setItem(XP_TOTAL_KEY, String(newTotal))
  return { gained, total: newTotal, leveledUp, newLevel }
}

/* ── Level label / badge ───────────────────────────────────────── */
export const LEVEL_BADGES: Record<number, { emoji: string; title: string }> = {
  1:  { emoji: '🌱', title: 'Beginner' },
  2:  { emoji: '📖', title: 'Learner' },
  3:  { emoji: '✏️', title: 'Student' },
  5:  { emoji: '🧠', title: 'Thinker' },
  7:  { emoji: '💡', title: 'Explorer' },
  10: { emoji: '🎯', title: 'Focused' },
  13: { emoji: '⚡', title: 'Sparker' },
  16: { emoji: '🔥', title: 'On Fire' },
  20: { emoji: '💎', title: 'Diamond' },
  25: { emoji: '🏆', title: 'Champion' },
  30: { emoji: '👑', title: 'Master' },
}

export function getBadge(level: number): { emoji: string; title: string } {
  const keys = Object.keys(LEVEL_BADGES).map(Number).sort((a, b) => b - a)
  for (const k of keys) {
    if (level >= k) return LEVEL_BADGES[k]
  }
  return LEVEL_BADGES[1]
}

/**
 * Build a toast message string after awarding XP.
 * Pure utility — no React dependency.
 */
export function xpToastMessage(gained: number, leveledUp: boolean, newLevel: number): string {
  if (leveledUp) {
    const badge = getBadge(newLevel)
    return `🎉 Level Up! ${badge.emoji} Level ${newLevel} — ${badge.title} (+${gained} XP)`
  }
  return `+${gained} XP`
}
