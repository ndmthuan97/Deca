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

/** Speak text using user TTS settings. No-op if ttsEnabled=false. */
export function speak(text: string, opts: SpeakOptions = {}): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) return

  const s = getSettings()
  if (!s.ttsEnabled) return

  window.speechSynthesis.cancel()

  const u = new SpeechSynthesisUtterance(text)
  u.lang = opts.lang ?? 'en-US'
  u.rate = opts.rate ?? s.ttsRate

  // Resolve voice: opts override > user setting > browser default
  const targetURI = opts.voiceURI ?? s.ttsVoiceURI
  if (targetURI) {
    const voices = window.speechSynthesis.getVoices()
    const found  = voices.find(v => v.voiceURI === targetURI)
    if (found) u.voice = found
  }

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

  const targetURI = opts.voiceURI ?? s.ttsVoiceURI
  if (targetURI) {
    const voices = window.speechSynthesis.getVoices()
    const found  = voices.find(v => v.voiceURI === targetURI)
    if (found) u.voice = found
  }

  window.speechSynthesis.speak(u)
}
