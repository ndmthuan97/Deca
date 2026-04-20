/**
 * User preferences — stored in localStorage, no DB needed.
 */

export interface UserSettings {
  // Review session
  reviewLimit: number
  // TTS
  ttsEnabled: boolean
  ttsRate: number
  ttsVoiceURI: string
  // Theme
  theme: 'light' | 'dark' | 'system' | 'auto'
  // Auto dark mode (only when theme === 'auto')
  autoThemeDarkFrom: number   // hour 0-23, default 19
  autoThemeDarkTo:   number   // hour 0-23, default 7
  // Learn mode
  learnBatchSize: number
  // Notifications
  notificationsEnabled: boolean
  notificationHour: number    // 0-23, default 20
}

const KEY = 'dace:settings'

export const DEFAULT_SETTINGS: UserSettings = {
  reviewLimit:          20,
  ttsEnabled:           true,
  ttsRate:              0.9,
  ttsVoiceURI:          '',
  theme:                'system',
  autoThemeDarkFrom:    19,
  autoThemeDarkTo:      7,
  learnBatchSize:       10,
  notificationsEnabled: false,
  notificationHour:     20,
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
