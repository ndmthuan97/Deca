/**
 * lib/starred.ts — Starred phrases using localStorage
 * 
 * Zero DB migration needed. Works client-side only.
 */

const KEY = 'dace:starred'

export function getStarred(): Set<number> {
  if (typeof window === 'undefined') return new Set()
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return new Set()
    return new Set(JSON.parse(raw) as number[])
  } catch {
    return new Set()
  }
}

export function toggleStar(phraseId: number): boolean {
  const starred = getStarred()
  if (starred.has(phraseId)) {
    starred.delete(phraseId)
  } else {
    starred.add(phraseId)
  }
  localStorage.setItem(KEY, JSON.stringify([...starred]))
  return starred.has(phraseId)
}

export function isStarred(phraseId: number): boolean {
  return getStarred().has(phraseId)
}

export function getStarredArray(): number[] {
  return [...getStarred()]
}

export function clearStarred(): void {
  localStorage.removeItem(KEY)
}
