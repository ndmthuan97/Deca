'use client'

import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Volume2, BookOpen, Settings, Shuffle, Headphones, Check, RotateCcw, X, Play } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import type { Phrase } from '@/db/schema'

function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }
}

function FlashcardTypeBadges({ type, functionText }: { type: string; functionText?: string | null }) {
  const [tipOpen, setTipOpen] = useState(false)
  const types = type.split(',').map(t => t.trim()).filter(Boolean)
  return (
    <div
      className="mb-3 flex flex-wrap justify-center gap-1 relative group"
      onClick={e => { e.stopPropagation(); if (functionText) setTipOpen(v => !v) }}
      onMouseLeave={() => setTipOpen(false)}
    >
      {types.map(t => (
        <span key={t} className="rounded-full bg-[#ebf5ff] dark:bg-[#0072f5]/10 px-2 py-0.5 text-[11px] font-medium text-[#0068d6] dark:text-[#60a5fa] border border-[#d0e8ff] dark:border-[#0072f5]/30 cursor-default">
          {t}
        </span>
      ))}
      {functionText && (
        <>
          {/* Desktop: hover */}
          <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-64 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-xl hidden md:block opacity-0 group-hover:opacity-100 transition-opacity duration-150">
            {functionText}
            <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900" />
          </div>
          {/* Mobile: tap */}
          {tipOpen && (
            <div className="pointer-events-none absolute top-full left-1/2 -translate-x-1/2 mt-2 z-30 w-64 rounded-xl bg-gray-900 px-3 py-2 text-xs text-white shadow-xl md:hidden">
              {functionText}
              <div className="absolute -top-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900" />
            </div>
          )}
        </>
      )}
    </div>
  )
}

/* ── Keybinding system ── */
type ActionId = 'prev' | 'next' | 'speak' | 'example1' | 'example2' | 'random'

interface KeyBinding { id: ActionId; label: string; key: string }

const DEFAULT_BINDINGS: KeyBinding[] = [
  { id: 'prev', label: 'Trước', key: 'ArrowLeft' },
  { id: 'next', label: 'Sau', key: 'ArrowRight' },
  { id: 'speak', label: 'Đọc câu', key: ' ' },
  { id: 'example1', label: 'Đọc VD1', key: '1' },
  { id: 'example2', label: 'Đọc VD2', key: '2' },
  { id: 'random', label: 'Ngẫu nhiên', key: 'r' },
]

const STORAGE_KEY = 'flashcard-keybindings'

function loadBindings(): KeyBinding[] {
  if (typeof window === 'undefined') return DEFAULT_BINDINGS
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_BINDINGS
    const saved = JSON.parse(raw) as Record<string, string>
    return DEFAULT_BINDINGS.map(b => ({ ...b, key: saved[b.id] ?? b.key }))
  } catch { return DEFAULT_BINDINGS }
}

function saveBindings(bindings: KeyBinding[]) {
  const map: Record<string, string> = {}
  bindings.forEach(b => { map[b.id] = b.key })
  localStorage.setItem(STORAGE_KEY, JSON.stringify(map))
}

function serialiseCombo(e: KeyboardEvent): string {
  const parts: string[] = []
  if (e.ctrlKey || e.metaKey) parts.push('Ctrl')
  if (e.altKey) parts.push('Alt')
  if (e.shiftKey && e.key.length > 1) parts.push('Shift')
  const k = e.key
  if (!['Control', 'Alt', 'Shift', 'Meta'].includes(k)) parts.push(k)
  return parts.join('+')
}

function matchesCombo(combo: string, e: KeyboardEvent): boolean {
  return serialiseCombo(e) === combo
}

function keyDisplayName(combo: string): string {
  return combo.split('+').map(p => {
    if (p === ' ') return 'Space'
    if (p === 'ArrowLeft') return '←'
    if (p === 'ArrowRight') return '→'
    if (p === 'ArrowUp') return '↑'
    if (p === 'ArrowDown') return '↓'
    return p.length === 1 ? p.toUpperCase() : p
  }).join(' + ')
}

/* ── Listening Practice ── */
const CONTRACTIONS: Record<string, string> = {
  "i'm": "i am", "you're": "you are", "he's": "he is", "she's": "she is",
  "it's": "it is", "we're": "we are", "they're": "they are",
  "i've": "i have", "you've": "you have", "we've": "we have", "they've": "they have",
  "i'll": "i will", "you'll": "you will", "he'll": "he will", "she'll": "she will",
  "it'll": "it will", "we'll": "we will", "they'll": "they will",
  "i'd": "i would", "you'd": "you would", "he'd": "he would", "she'd": "she would",
  "we'd": "we would", "they'd": "they would",
  "isn't": "is not", "aren't": "are not", "wasn't": "was not", "weren't": "were not",
  "don't": "do not", "doesn't": "does not", "didn't": "did not",
  "haven't": "have not", "hasn't": "has not", "hadn't": "had not",
  "won't": "will not", "wouldn't": "would not", "couldn't": "could not",
  "shouldn't": "should not", "can't": "cannot", "let's": "let us",
  "that's": "that is", "there's": "there is", "here's": "here is",
  "what's": "what is", "who's": "who is", "how's": "how is",
}

function normalize(s: string) {
  return s.toLowerCase().replace(/[^a-z0-9\s']/g, '').replace(/\s+/g, ' ').trim()
}

function expandContractions(s: string) {
  let result = normalize(s)
  for (const [contraction, expansion] of Object.entries(CONTRACTIONS)) {
    result = result.replace(new RegExp(`\\b${contraction.replace("'", "'")}\\b`, 'gi'), expansion)
  }
  return result.replace(/\s+/g, ' ').trim()
}

function diffWords(input: string, answer: string): { word: string; correct: boolean }[] {
  const expandedInput = expandContractions(input)
  const expandedAnswer = expandContractions(answer)
  const inputWords = expandedInput.split(' ')
  const answerWords = expandedAnswer.split(' ')
  const originalWords = answer.split(/\s+/)
  return answerWords.map((w, i) => ({ word: originalWords[i] || w, correct: (inputWords[i] ?? '') === w }))
}

function speakAccent(text: string, accent: 'UK' | 'US') {
  if (!('speechSynthesis' in window)) return
  window.speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = accent === 'UK' ? 'en-GB' : 'en-US'
  const voices = window.speechSynthesis.getVoices()
  const match = voices.find(v => v.lang === u.lang) || voices.find(v => v.lang.startsWith(accent === 'UK' ? 'en-GB' : 'en-US'))
  if (match) u.voice = match
  window.speechSynthesis.speak(u)
}

interface DictPhonetic { text?: string; audio?: string }
interface DictMeaning { partOfSpeech: string; definitions: { definition: string }[] }
interface DictEntry { phonetics: DictPhonetic[]; meanings: DictMeaning[] }

// ─── localStorage IPA cache (TTL: 7 days) ────────────────────────────────────
const IPA_CACHE_KEY_PREFIX = 'dace:ipa:'
const IPA_CACHE_TTL = 7 * 24 * 60 * 60 * 1000

interface IpaCacheEntry {
  ipa: { uk: string; us: string }
  meaning: string | null
  cachedAt: number
}

function loadIpaCache(word: string): IpaCacheEntry | null {
  try {
    const raw = localStorage.getItem(IPA_CACHE_KEY_PREFIX + word)
    if (!raw) return null
    const entry: IpaCacheEntry = JSON.parse(raw)
    if (Date.now() - entry.cachedAt > IPA_CACHE_TTL) {
      localStorage.removeItem(IPA_CACHE_KEY_PREFIX + word)
      return null
    }
    return entry
  } catch { return null }
}

function saveIpaCache(word: string, ipa: { uk: string; us: string }, meaning: string | null) {
  try {
    const entry: IpaCacheEntry = { ipa, meaning, cachedAt: Date.now() }
    localStorage.setItem(IPA_CACHE_KEY_PREFIX + word, JSON.stringify(entry))
  } catch { /* quota exceeded — silently ignore */ }
}

function WordChip({ word }: { word: string }) {
  const [open, setOpen] = useState(false)
  const [ipa, setIpa] = useState<{ uk: string; us: string } | null>(null)
  const [meaning, setMeaning] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null)
  const btnRef = useRef<HTMLButtonElement>(null)
  const tipRef = useRef<HTMLDivElement>(null)
  const cleanWord = word.replace(/[^a-zA-Z'-]/g, '').toLowerCase()

  // Click outside to close
  useEffect(() => {
    if (!open) return
    const handler = (e: MouseEvent) => {
      if (btnRef.current?.contains(e.target as Node)) return
      if (tipRef.current?.contains(e.target as Node)) return
      setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  // Calculate position
  useEffect(() => {
    if (!open || !btnRef.current) return
    const rect = btnRef.current.getBoundingClientRect()
    const tipW = 240
    let left = rect.left + rect.width / 2 - tipW / 2
    if (left < 8) left = 8
    if (left + tipW > window.innerWidth - 8) left = window.innerWidth - tipW - 8
    setPos({ top: rect.top - 8, left })
  }, [open])

  // Fetch IPA + translation — check localStorage cache first
  useEffect(() => {
    if (!open || ipa !== null || loading || !cleanWord) return

    // Cache hit → restore immediately, skip API calls
    const cached = loadIpaCache(cleanWord)
    if (cached) {
      setIpa(cached.ipa)
      setMeaning(cached.meaning)
      return
    }

    setLoading(true)
    let resolvedIpa: { uk: string; us: string } = { uk: '', us: '' }
    let resolvedMeaning: string | null = null

    const dictP = fetch(`https://api.dictionaryapi.dev/api/v2/entries/en/${cleanWord}`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: DictEntry[]) => {
        const entry = data[0]
        const phonetics = entry?.phonetics ?? []
        const ukP = phonetics.find(p => p.text && (p.audio?.includes('uk') || p.audio?.includes('gb')))
        const usP = phonetics.find(p => p.text && (p.audio?.includes('us') || p.audio?.includes('au')))
        const fallback = phonetics.find(p => p.text)
        resolvedIpa = { uk: ukP?.text ?? fallback?.text ?? '', us: usP?.text ?? fallback?.text ?? '' }
        setIpa(resolvedIpa)
      })
      .catch(() => { resolvedIpa = { uk: '', us: '' }; setIpa(resolvedIpa) })

    const transP = fetch(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(cleanWord)}&langpair=en|vi`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((data: { responseData?: { translatedText?: string } }) => {
        const t = data?.responseData?.translatedText
        if (t && t.toLowerCase() !== cleanWord) { resolvedMeaning = t; setMeaning(t) }
      })
      .catch(() => {})

    Promise.allSettled([dictP, transP]).finally(() => {
      setLoading(false)
      // Persist to cache after both calls finish
      saveIpaCache(cleanWord, resolvedIpa, resolvedMeaning)
    })
  }, [open, ipa, loading, cleanWord])

  return (
    <>
      <button
        ref={btnRef}
        onClick={() => setOpen(v => !v)}
        className={cn(
          'px-1.5 py-0.5 rounded-lg border font-medium transition-colors cursor-pointer underline decoration-dotted underline-offset-4',
          open
            ? 'border-[#0072f5] dark:border-[#0072f5] bg-[#ebf5ff] dark:bg-[#0072f5]/20 text-[#0060d0] dark:text-[#60a5fa] decoration-[#0072f5]'
            : 'border-transparent hover:border-[#d0e8ff] dark:hover:border-[#0072f5]/30 hover:bg-[#f5faff] dark:hover:bg-[#0072f5]/10 text-gray-900 dark:text-gray-100 decoration-gray-300 dark:decoration-gray-600'
        )}
      >
        {word}
      </button>
      {open && pos && (
        <div
          ref={tipRef}
          className="fixed z-[9999] w-60 rounded-xl bg-gray-900 dark:bg-gray-800 shadow-2xl text-left"
          style={{ top: pos.top, left: pos.left, transform: 'translateY(-100%)' }}
        >
          {/* Arrow */}
          <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 h-2 w-2 rotate-45 bg-gray-900 dark:bg-gray-800" />

          <div className="px-4 pt-3 pb-2">
            <p className="font-bold text-white text-base">{cleanWord}</p>
          </div>
          <div className="px-4 pb-3 flex items-center gap-2">
            <button onClick={() => speakAccent(cleanWord, 'UK')} className="flex items-center gap-1.5 rounded-lg border border-green-500/60 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10 transition-colors">
              UK <Volume2 className="h-3 w-3" />
            </button>
            <button onClick={() => speakAccent(cleanWord, 'US')} className="flex items-center gap-1.5 rounded-lg border border-green-500/60 px-3 py-1.5 text-xs text-green-400 hover:bg-green-500/10 transition-colors">
              US <Volume2 className="h-3 w-3" />
            </button>
          </div>
          <div className="px-4 py-2 border-t border-gray-700/50">
            <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">IPA</p>
            {loading ? (
              <p className="text-xs text-gray-400">...</p>
            ) : ipa && (ipa.uk || ipa.us) ? (
              <p className="text-sm text-white font-mono">
                {ipa.uk && <span>UK {ipa.uk}</span>}
                {ipa.uk && ipa.us && <span className="mx-2 text-gray-500">|</span>}
                {ipa.us && <span>US {ipa.us}</span>}
              </p>
            ) : (
              <p className="text-xs text-gray-400 italic">Không có dữ liệu</p>
            )}
          </div>
          {meaning && (
            <div className="px-4 py-2 pb-3 border-t border-gray-700/50">
              <p className="text-[10px] text-gray-400 uppercase tracking-wider mb-1">Dịch nghĩa</p>
              <p className="text-sm text-white leading-relaxed">{meaning}</p>
            </div>
          )}
        </div>
      )}
    </>
  )
}

function ListeningPractice({ phrase, onNext }: { phrase: Phrase; onNext: () => void }) {
  const [input, setInput] = useState('')
  const [status, setStatus] = useState<'idle' | 'wrong' | 'correct'>('idle')
  const [diff, setDiff] = useState<{ word: string; correct: boolean }[]>([])
  const [hintWords, setHintWords] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const [showFullAnswer, setShowFullAnswer] = useState(false)
  const [audioProgress, setAudioProgress] = useState(0)
  const [audioDuration, setAudioDuration] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [selectedWord, setSelectedWord] = useState<string | null>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const progressInterval = useRef<ReturnType<typeof setInterval> | null>(null)

  const answerWords = phrase.sample_sentence.split(/\s+/)

  const formatTime = (s: number) => {
    const m = Math.floor(s / 60)
    const sec = Math.floor(s % 60)
    return `${m}:${sec.toString().padStart(2, '0')}`
  }

  const speakWithProgress = useCallback((text: string) => {
    if (!('speechSynthesis' in window)) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    u.rate = 0.85

    // Estimate duration (~100ms per character for slower speech)
    const estimated = Math.max(1, text.length * 0.08)
    setAudioDuration(estimated)
    setAudioProgress(0)
    setIsPlaying(true)

    const startTime = Date.now()
    if (progressInterval.current) clearInterval(progressInterval.current)
    progressInterval.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000
      setAudioProgress(Math.min(elapsed, estimated))
      if (elapsed >= estimated) {
        if (progressInterval.current) clearInterval(progressInterval.current)
      }
    }, 50)

    u.onend = () => {
      setIsPlaying(false)
      setAudioProgress(estimated)
      if (progressInterval.current) clearInterval(progressInterval.current)
    }
    window.speechSynthesis.speak(u)
  }, [])

  useEffect(() => {
    setInput(''); setStatus('idle'); setDiff([]); setHintWords(0); setShowAnswer(false); setAudioProgress(0); setIsPlaying(false)
    const t = setTimeout(() => speakWithProgress(phrase.sample_sentence), 300)
    return () => { clearTimeout(t); if (progressInterval.current) clearInterval(progressInterval.current) }
  }, [phrase, speakWithProgress])

  const handleCheck = () => {
    if (expandContractions(input) === expandContractions(phrase.sample_sentence)) {
      setStatus('correct')
    } else {
      setStatus('wrong')
      setDiff(diffWords(input, phrase.sample_sentence))
      // Auto hint next word
      setHintWords(prev => Math.min(prev + 1, answerWords.length))
    }
  }

  const handleSkip = () => { setShowAnswer(true); setStatus('correct') }

  const buildHintDisplay = () => {
    return answerWords.map((word, i) => {
      if (i < hintWords) return word
      return word.replace(/[a-zA-Z]/g, '*')
    }).join(' ')
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      if (status === 'correct') onNext()
      else if (input.trim()) handleCheck()
    }
  }

  const progressPct = audioDuration > 0 ? (audioProgress / audioDuration) * 100 : 0

  return (
    <div className="w-full max-w-4xl mx-auto">
      <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm overflow-hidden">

        {/* Audio player bar */}
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-gray-50 dark:bg-gray-800/60 border-b border-gray-100 dark:border-gray-800">
          <button
            onClick={() => speakWithProgress(phrase.sample_sentence)}
            className={cn(
              'flex h-7 w-7 items-center justify-center rounded-full text-white transition-all shrink-0',
              isPlaying ? 'bg-[#171717] scale-105' : 'bg-gray-600 dark:bg-gray-500 hover:bg-[#333]'
            )}
          >
            {isPlaying ? <Volume2 className="h-3.5 w-3.5" /> : <Play className="h-3 w-3 ml-0.5" />}
          </button>
          <span className="text-[11px] text-gray-500 dark:text-gray-400 font-mono tabular-nums shrink-0">
            {formatTime(audioProgress)}/{formatTime(audioDuration)}
          </span>
          <div className="flex-1 h-1 rounded-full bg-gray-200 dark:bg-gray-700 overflow-hidden">
            <div
              className="h-full rounded-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-75"
              style={{ width: `${progressPct}%` }}
            />
          </div>

        </div>

        {/* Main content area — always 2 columns on desktop */}
        <div className="p-5 grid grid-cols-1 md:grid-cols-[1fr_1fr] gap-5">

          {/* Left / Main column */}
          <div className="space-y-4">

            {/* Textarea / Answer display */}
            {status !== 'correct' ? (
              <textarea
                ref={inputRef}
                value={input}
                onChange={e => { setInput(e.target.value); if (status === 'wrong') setStatus('idle') }}
                onKeyDown={handleKeyDown}
                placeholder="Nhập câu bạn nghe được..."
                rows={3}
                className={cn(
                  'w-full rounded-lg border-2 px-4 py-3 text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400/60 focus:outline-none resize-none transition-colors bg-white dark:bg-gray-800/50',
                  status === 'wrong'
                    ? 'border-blue-400 dark:border-blue-500'
                    : 'border-gray-300 dark:border-gray-600 focus:border-blue-400 dark:focus:border-blue-500'
                )}
              />
            ) : (
              <div className="rounded-lg border-2 border-green-400 dark:border-green-500 bg-white dark:bg-gray-800/50 px-4 py-3 min-h-[76px] flex items-start">
                <p className="text-sm text-gray-900 dark:text-gray-100">{showAnswer ? phrase.sample_sentence : input}</p>
              </div>
            )}

            {/* ═══ IDLE STATE ═══ */}
            {status === 'idle' && (
              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={handleSkip}
                  className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-400 transition-colors"
                >
                  Bỏ qua
                </button>
                <button
                  onClick={handleCheck}
                  disabled={!input.trim()}
                  className="rounded-md bg-blue-500 hover:bg-blue-600 disabled:opacity-40 disabled:cursor-not-allowed px-4 py-1.5 text-sm text-white font-medium transition-colors"
                >
                  Kiểm tra
                </button>
              </div>
            )}

            {/* ═══ WRONG STATE ═══ */}
            {status === 'wrong' && (
              <div className="space-y-3">
                {/* Incorrect label + Skip right */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="text-amber-500 text-lg leading-none">⚠</span>
                    <span className="text-sm font-semibold text-gray-700 dark:text-gray-200">Chưa chính xác</span>
                  </div>
                  <button
                    onClick={handleSkip}
                    className="rounded-md border border-gray-300 dark:border-gray-600 px-3 py-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:border-gray-400 transition-colors"
                  >
                    Bỏ qua
                  </button>
                </div>

                {/* Single hint line */}
                <p className="text-sm font-mono tracking-wide leading-relaxed">
                  {answerWords.map((word, i) => {
                    const d = diff[i]
                    if (d?.correct) return <span key={i} className="inline mr-1 text-green-500 dark:text-green-400 font-semibold">{d.word}</span>
                    if (i < hintWords) return <span key={i} className="inline mr-1 text-amber-500 dark:text-amber-400">{word}</span>
                    if (showFullAnswer) return <span key={i} className="inline mr-1 text-gray-500 dark:text-gray-400">{word}</span>
                    return <span key={i} className="inline mr-1 text-gray-400 dark:text-gray-500">{word.replace(/[a-zA-Z]/g, '*')}</span>
                  })}
                </p>

                {/* Options */}
                <div className="space-y-2 pt-1">
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={true} readOnly className="h-4 w-4 rounded border-gray-400 dark:border-gray-500 accent-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">Gợi ý ngay khi sai</span>
                  </label>
                  <label className="flex items-center gap-2.5 cursor-pointer group">
                    <input type="checkbox" checked={showFullAnswer} onChange={e => setShowFullAnswer(e.target.checked)} className="h-4 w-4 rounded border-gray-400 dark:border-gray-500 accent-blue-500" />
                    <span className="text-sm text-gray-600 dark:text-gray-300 group-hover:text-gray-800 dark:group-hover:text-gray-100 transition-colors">Hiện cả câu</span>
                  </label>
                </div>
              </div>
            )}

            {/* ═══ CORRECT STATE ═══ */}
            {status === 'correct' && (
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-1.5 text-green-500 dark:text-green-400">
                  <Check className="h-4.5 w-4.5" />
                  <span className="text-sm font-semibold">{showAnswer ? 'Đáp án' : 'Chính xác!'}</span>
                </div>
                <button
                  onClick={onNext}
                  className="ml-auto rounded-md bg-blue-500 hover:bg-blue-600 px-4 py-1.5 text-sm text-white font-medium transition-colors flex items-center gap-1.5"
                >
                  Tiếp tục <ChevronRight className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
          </div>

          {/* Right column — always present, content reveals on correct */}
          <div className="space-y-3 overflow-visible">
            {status === 'correct' ? (
              <>
                {/* Translation */}
                {phrase.translation && (
                  <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3.5">
                    <p className="text-base text-gray-800 dark:text-gray-200 leading-relaxed">{phrase.translation}</p>
                  </div>
                )}

                {/* Pronunciation */}
                <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-3.5">
                  <p className="text-xs text-gray-400 mb-2.5">Pronunciation</p>
                  <div className="flex flex-wrap gap-x-1 gap-y-1.5">
                    {(showAnswer ? answerWords : input.trim().split(/\s+/)).map((word, i) => (
                      <WordChip key={i} word={word} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="hidden md:block" />
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

interface FlashcardViewProps { phrases: Phrase[] }

export function FlashcardView({ phrases }: FlashcardViewProps) {
  const [index, setIndex] = useState(0)
  const [swipeDir, setSwipeDir] = useState<'left' | 'right' | null>(null)
  const [showSettings, setShowSettings] = useState(false)
  const [bindings, setBindings] = useState<KeyBinding[]>(DEFAULT_BINDINGS)
  const [capturingId, setCapturingId] = useState<ActionId | null>(null)
  const [shuffleOn, setShuffleOn] = useState(false)
  const [practiceMode, setPracticeMode] = useState(false)
  const [shuffleSeed, setShuffleSeed] = useState(0)
  const touchStartX = useRef<number | null>(null)
  const touchStartY = useRef<number | null>(null)

  useEffect(() => { setBindings(loadBindings()) }, [])
  useEffect(() => { setIndex(0) }, [phrases])

  // Fisher-Yates shuffle with seed-based trigger
  const orderedPhrases = useMemo(() => {
    if (!shuffleOn) return phrases
    const arr = [...phrases]
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phrases, shuffleOn, shuffleSeed])

  const current = orderedPhrases[index]
  const total = orderedPhrases.length

  const keyFor = useCallback((id: ActionId) => bindings.find(b => b.id === id)?.key ?? '', [bindings])

  const goPrev = useCallback(() => {
    if (index === 0) return
    setSwipeDir('right')
    setTimeout(() => { setIndex(i => i - 1); setSwipeDir(null) }, 150)
  }, [index])

  const goNext = useCallback(() => {
    if (index === total - 1) return
    setSwipeDir('left')
    setTimeout(() => { setIndex(i => i + 1); setSwipeDir(null) }, 150)
  }, [index, total])

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (capturingId) return
      // In practice mode, only allow speak shortcut
      if (practiceMode) {
        if (matchesCombo(keyFor('speak'), e)) { e.preventDefault(); speak(orderedPhrases[index]?.sample_sentence ?? '') }
        return
      }
      if (matchesCombo(keyFor('prev'), e)) goPrev()
      if (matchesCombo(keyFor('next'), e)) goNext()
      if (matchesCombo(keyFor('speak'), e)) { e.preventDefault(); speak(orderedPhrases[index]?.sample_sentence ?? '') }
      if (matchesCombo(keyFor('example1'), e) && orderedPhrases[index]?.example1) speak(orderedPhrases[index].example1!)
      if (matchesCombo(keyFor('example2'), e) && orderedPhrases[index]?.example2) speak(orderedPhrases[index].example2!)
      if (matchesCombo(keyFor('random'), e)) { setIndex(Math.floor(Math.random() * orderedPhrases.length)) }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [goPrev, goNext, index, orderedPhrases, keyFor, capturingId, practiceMode])

  // Key capture for settings
  useEffect(() => {
    if (!capturingId) return
    const handler = (e: KeyboardEvent) => {
      e.preventDefault()
      if (e.key === 'Escape') { setCapturingId(null); return }
      // Ignore modifier-only presses
      if (['Control', 'Alt', 'Shift', 'Meta'].includes(e.key)) return
      const combo = serialiseCombo(e)
      const updated = bindings.map(b => b.id === capturingId ? { ...b, key: combo } : b)
      setBindings(updated)
      saveBindings(updated)
      setCapturingId(null)
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [capturingId, bindings])

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX
    touchStartY.current = e.touches[0].clientY
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (!touchStartX.current || !touchStartY.current) return
    const dx = e.changedTouches[0].clientX - touchStartX.current
    const dy = e.changedTouches[0].clientY - touchStartY.current
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      dx < 0 ? goNext() : goPrev()
    }
    touchStartX.current = null
    touchStartY.current = null
  }

  if (total === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <div className="mb-4 rounded-full bg-gray-100 dark:bg-gray-800 p-5">
          <BookOpen className="h-8 w-8 text-gray-300 dark:text-gray-600" />
        </div>
        <p className="text-sm text-gray-400">Không có câu nào phù hợp với bộ lọc</p>
      </div>
    )
  }

  const examples = [
    { sentence: current.example1, translation: current.example1_translation, pronunciation: current.example1_pronunciation, n: 1 },
    { sentence: current.example2, translation: current.example2_translation, pronunciation: current.example2_pronunciation, n: 2 },
  ].filter(e => e.sentence)

  const progress = ((index + 1) / total) * 100

  return (
    <div className="flex flex-col items-center gap-5 py-6 px-4">

      {/* ── Progress + Shuffle ── */}
      <div className="w-full max-w-lg flex items-center gap-3">
        <button
          onClick={() => { setShuffleOn(v => !v); setShuffleSeed(s => s + 1); setIndex(0) }}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg border transition-colors shrink-0',
            shuffleOn
              ? 'border-[#171717] bg-[#fafafa] text-[#171717] dark:border-gray-400 dark:bg-gray-800 dark:text-gray-200'
              : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-gray-300'
          )}
          title={shuffleOn ? 'Tắt xáo trộn' : 'Xáo trộn'}
        >
          <Shuffle className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setPracticeMode(v => !v)}
          className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg border transition-colors shrink-0',
            practiceMode
              ? 'border-[#171717] bg-[#fafafa] text-[#171717] dark:border-gray-400 dark:bg-gray-800 dark:text-gray-200'
              : 'border-gray-200 bg-white text-gray-400 hover:text-gray-600 dark:border-gray-700 dark:bg-gray-900 dark:hover:text-gray-300'
          )}
          title={practiceMode ? 'Tắt luyện tập' : 'Luyện tập nghe'}
        >
          <Headphones className="h-3.5 w-3.5" />
        </button>
        <div className="flex-1 h-1 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
        <span className="text-xs text-gray-400 tabular-nums shrink-0">
          <span className="font-semibold text-gray-600 dark:text-gray-300">{index + 1}</span>/{total}
        </span>
      </div>

      {/* ── Practice Mode ── */}
      {practiceMode ? (
        <ListeningPractice
          phrase={current}
          onNext={() => {
            if (index < total - 1) goNext()
            else setIndex(0)
          }}
        />
      ) : (
      /* ── Card ── */
      <div className="w-full max-w-lg">
        <div
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
          className="relative rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm select-none"
          style={{
            transform: swipeDir === 'left' ? 'translateX(-6px)' : swipeDir === 'right' ? 'translateX(6px)' : 'none',
            opacity: swipeDir ? 0.75 : 1,
            transition: 'transform 150ms ease, opacity 150ms ease',
          }}
        >
          {/* ── Header: title + type ── */}
          <div className="flex items-center justify-between px-5 pt-4">
            <p className="text-[10px] uppercase tracking-wider text-gray-400/70 dark:text-gray-500/70">Câu mẫu</p>
            <FlashcardTypeBadges type={current.type ?? ''} functionText={current.function} />
          </div>

          {/* ── Câu mẫu + phiên âm + nghĩa ── */}
          <div className="rounded-xl bg-[#fafafa] dark:bg-gray-800/50 border border-[#ebebeb] dark:border-gray-700 p-4 mx-5 mt-1.5">
            <div className="flex items-start gap-2">
              <div className="flex-1 min-w-0">
                <p className="text-xl font-bold text-gray-900 dark:text-gray-100">{current.sample_sentence}</p>
                {current.pronunciation && (
                  <p className="font-mono text-sm text-[#888] dark:text-[#aaa] mt-0.5">{current.pronunciation}</p>
                )}
                {current.translation && (
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1.5">{current.translation}</p>
                )}
              </div>
              <button onClick={() => speak(current.sample_sentence)} className="text-[#999] hover:text-[#171717] shrink-0 mt-1">
                <Volume2 className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* ── Cấu trúc ngữ pháp ── */}
          {current.structure && (
            <div className="mx-5 mt-3">
              <p className="text-[10px] uppercase tracking-wider text-gray-400/70 dark:text-gray-500/70 mb-1.5">Cấu trúc</p>
              <div className="rounded-xl bg-gray-50 dark:bg-gray-800/50 border border-gray-200 dark:border-gray-700 p-3">
                <p className="text-sm leading-relaxed font-mono">
                  {current.structure.split(/(\([^)]+\))/g).map((part: string, i: number) =>
                    part.startsWith('(') && part.endsWith(')') ? (
                      <span key={i} className="text-[#0072f5] dark:text-[#60a5fa] font-semibold">{part}</span>
                    ) : (
                      <span key={i} className="text-gray-700 dark:text-gray-300">{part}</span>
                    )
                  )}
                </p>
              </div>
            </div>
          )}

          {/* ── Ví dụ ── */}
          {examples.length > 0 && (
            <div className="px-5 pt-2 pb-4 space-y-1.5">
              <p className="text-[10px] uppercase tracking-wider text-gray-400/70 dark:text-gray-500/70">Ví dụ</p>
              {examples.map(ex => (
                <div key={ex.n} className="rounded-lg bg-gray-50 dark:bg-gray-800/50 px-3 py-2 border border-gray-200 dark:border-gray-700">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-[#ebebeb] dark:bg-gray-700 text-[9px] font-bold text-[#666] dark:text-gray-300 shrink-0">{ex.n}</span>
                    <p className="text-sm text-gray-800 dark:text-gray-200 italic flex-1 min-w-0">{ex.sentence}</p>
                    <button onClick={() => speak(ex.sentence!)} className="text-gray-400 hover:text-[#171717] shrink-0">
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  {ex.translation && <p className="text-xs text-gray-500 dark:text-gray-400 pl-6">{ex.translation}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
      )}

      {/* ── Navigation ── */}
      <div className="flex items-center gap-4">
        <button
          onClick={goPrev}
          disabled={index === 0}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>

        {/* Dot indicators */}
        <div className="flex items-center gap-1.5">
          {total <= 9 ? (
            [...Array(total)].map((_, i) => (
              <button
                key={i}
                onClick={() => setIndex(i)}
                className={cn(
                  'rounded-full transition-all duration-200',
                  i === index ? 'w-4 h-2 bg-[#171717] dark:bg-[#f5f5f5]' : 'w-2 h-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300'
                )}
              />
            ))
          ) : (
            <span className="text-xs text-gray-400 font-medium tabular-nums px-1">
              {index + 1} / {total}
            </span>
          )}
        </div>

        <button
          onClick={goNext}
          disabled={index === total - 1}
          className="flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:text-gray-700 dark:hover:text-gray-300 disabled:opacity-25 disabled:cursor-not-allowed transition-colors shadow-sm"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>

      {/* Hint bar desktop */}
      <div className="hidden md:flex items-center justify-center gap-3 text-[10px] text-gray-400 dark:text-gray-600">
        {bindings.map(b => (
          <span key={b.id} className="flex items-center gap-1">
            <kbd className="px-1.5 py-0.5 bg-gray-100 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded text-[10px] font-mono">{keyDisplayName(b.key)}</kbd>
            {b.label}
          </span>
        ))}
        <button
          onClick={() => setShowSettings(v => !v)}
          className="ml-1 p-1 rounded-lg text-gray-300 hover:text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Cài đặt phím tắt"
        >
          <Settings className="h-3.5 w-3.5" />
        </button>
      </div>

      {/* Settings dialog */}
      <Dialog open={showSettings} onOpenChange={setShowSettings}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-gray-900 dark:text-gray-100">
              <Settings className="h-4 w-4 text-[#666]" />
              Cài đặt phím tắt
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-2 pt-1">
            {bindings.map(b => (
              <div key={b.id} className="flex items-center justify-between gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400">{b.label}</span>
                <button
                  onClick={() => setCapturingId(b.id)}
                  className={cn(
                    'min-w-[72px] px-3 py-1.5 rounded-lg border text-sm font-mono text-center transition-colors',
                    capturingId === b.id
                      ? 'border-[#0072f5] bg-[#ebf5ff] dark:bg-[#0072f5]/10 text-[#0068d6] animate-pulse'
                      : 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:border-gray-300'
                  )}
                >
                  {capturingId === b.id ? 'Nhấn phím...' : keyDisplayName(b.key)}
                </button>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between pt-3 border-t border-gray-100 dark:border-gray-800">
            <p className="text-[11px] text-gray-400 italic">Nhấn vào ô → bấm phím mới • Esc để hủy</p>
            <button
              onClick={() => { setBindings(DEFAULT_BINDINGS); saveBindings(DEFAULT_BINDINGS) }}
              className="text-xs text-[#0072f5] hover:text-[#0060d0] font-medium"
            >Mặc định</button>
          </div>
        </DialogContent>
      </Dialog>

      <p className="text-[11px] text-gray-300 dark:text-gray-700 md:hidden">Vuốt để chuyển</p>
    </div>
  )
}
