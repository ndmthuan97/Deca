/**
 * User preferences — stored in localStorage, no DB needed.
 */

export interface UserSettings {
  // Review session
  reviewLimit: number        // cards per session (default 20)
  // TTS
  ttsEnabled: boolean        // global TTS toggle (default true)
  ttsRate: number            // speech rate 0.5–2.0 (default 0.9)
  ttsVoiceURI: string        // URI of selected voice (default '')
  // Theme
  theme: 'light' | 'dark' | 'system'
  // Learn mode
  learnBatchSize: number     // phrases per learn session (default 10)
}

const KEY = 'dace:settings'

export const DEFAULT_SETTINGS: UserSettings = {
  reviewLimit:    20,
  ttsEnabled:     true,
  ttsRate:        0.9,
  ttsVoiceURI:    '',
  theme:          'system',
  learnBatchSize: 10,
}

export function getSettings(): UserSettings {
  if (typeof window === 'undefined') return DEFAULT_SETTINGS
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return DEFAULT_SETTINGS
    return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    return DEFAULT_SETTINGS
  }
}

export function saveSettings(partial: Partial<UserSettings>): UserSettings {
  const current = getSettings()
  const next = { ...current, ...partial }
  localStorage.setItem(KEY, JSON.stringify(next))
  return next
}

export function resetSettings(): UserSettings {
  localStorage.removeItem(KEY)
  return DEFAULT_SETTINGS
}
