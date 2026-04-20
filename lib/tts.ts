/**
 * Centralised TTS utility — reads user preferences from localStorage.
 * Drop-in replacement for inline SpeechSynthesisUtterance calls.
 *
 * Usage:
 *   import { speak } from '@/lib/tts'
 *   speak('Hello world')          // uses saved voice + rate
 *   speak('Hello', { rate: 0.7 }) // override rate
 */

import { getSettings } from '@/lib/settings'

export interface SpeakOptions {
  /** Override rate (0.5–2.0). Falls back to user setting. */
  rate?: number
  /** Override voice URI. Falls back to user setting. */
  voiceURI?: string
  /** Language tag if no voice URI is set. Default: 'en-US'. */
  lang?: string
}

/**
 * Resolve the best available voice.
 * Priority: explicit URI > saved setting > Google US English > any en-US > browser default
 */
function resolveVoice(targetURI: string | undefined): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices()
  if (!voices.length) return null

  // 1. Explicit / saved URI
  if (targetURI) {
    const found = voices.find(v => v.voiceURI === targetURI)
    if (found) return found
  }

  // 2. Google US English (preferred default)
  const google = voices.find(v => v.name === 'Google US English')
  if (google) return google

  // 3. Any en-US voice
  const enUS = voices.find(v => v.lang === 'en-US')
  if (enUS) return enUS

  return null
}

/** Speak text using user TTS settings. No-op if ttsEnabled=false. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const s = getSettings()
  if (!s.ttsEnabled) return

  window.speechSynthesis.cancel()

  const u = new SpeechSynthesisUtterance(text)
  u.lang = opts.lang ?? 'en-US'
  u.rate = opts.rate ?? s.ttsRate

  const voice = resolveVoice((opts.voiceURI ?? s.ttsVoiceURI) || undefined)
  if (voice) u.voice = voice

  window.speechSynthesis.speak(u)
}

/** Force-speak regardless of ttsEnabled (e.g. Dictation mode auto-play). */
export function speakForced(text: string, opts: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const s = getSettings()
  window.speechSynthesis.cancel()

  const u = new SpeechSynthesisUtterance(text)
  u.lang = opts.lang ?? 'en-US'
  u.rate = opts.rate ?? s.ttsRate

  const voice = resolveVoice((opts.voiceURI ?? s.ttsVoiceURI) || undefined)
  if (voice) u.voice = voice

  window.speechSynthesis.speak(u)
}

