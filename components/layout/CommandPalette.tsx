'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, X, Loader2, ArrowRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface SearchResult {
  id:              number
  topic_id:        number | null
  sample_sentence: string
  translation:     string | null
  pronunciation:   string | null
  type:            string | null
  topic_name:      string
  topic_icon:      string | null
  topic_slug:      string
}

/* ── Hook: keyboard shortcut ─────────────────────────────────── */
function useCommandPalette() {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(v => !v)
      }
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  return { open, setOpen }
}

/* ── Main Component ─────────────────────────────────────────── */
export function CommandPalette() {
  const router = useRouter()
  const { open, setOpen } = useCommandPalette()

  const [query, setQuery]     = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [cursor, setCursor]   = useState(0)
  const inputRef              = useRef<HTMLInputElement>(null)
  const debouncedQ            = useDebounce(query, 250)

  // Focus input khi mở
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50)
      setQuery('')
      setResults([])
      setCursor(0)
    }
  }, [open])

  // Fetch results
  useEffect(() => {
    if (!debouncedQ.trim()) { setResults([]); return }
    setLoading(true)
    fetch(`/api/search?q=${encodeURIComponent(debouncedQ)}&limit=15`)
      .then(r => r.json())
      .then(body => { setResults(body.data?.results ?? []); setCursor(0) })
      .catch(() => setResults([]))
      .finally(() => setLoading(false))
  }, [debouncedQ])

  // Keyboard navigation trong results
  const onKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setCursor(c => Math.min(c + 1, results.length - 1)) }
    if (e.key === 'ArrowUp')   { e.preventDefault(); setCursor(c => Math.max(c - 1, 0)) }
    if (e.key === 'Enter' && results[cursor]) {
      navigate(results[cursor])
    }
  }, [results, cursor])

  function navigate(r: SearchResult) {
    router.push(`/topics/${r.topic_id}`)
    setOpen(false)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] px-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={() => setOpen(false)}
      />

      {/* Panel */}
      <div className="relative w-full max-w-xl rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-2xl shadow-black/20 overflow-hidden">

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-gray-100 dark:border-gray-800">
          {loading
            ? <Loader2 className="h-4 w-4 text-orange-500 animate-spin shrink-0" />
            : <Search   className="h-4 w-4 text-gray-400 shrink-0" />
          }
          <input
            ref={inputRef}
            id="cmd-palette-input"
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={onKeyDown}
            placeholder="Tìm câu, từ, chủ đề..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-white placeholder:text-gray-400 outline-none"
          />
          <div className="flex items-center gap-1.5">
            <kbd className="hidden sm:inline-flex h-5 items-center rounded border border-gray-200 dark:border-gray-700 px-1.5 text-[10px] text-gray-400 font-mono">Esc</kbd>
            <button
              onClick={() => setOpen(false)}
              className="p-0.5 rounded-md text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-1.5">
          {!query.trim() && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <Search className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-sm">Gõ để tìm kiếm xuyên tất cả chủ đề</p>
              <p className="text-xs mt-1 opacity-60">câu mẫu, bản dịch...</p>
            </div>
          )}

          {query.trim() && !loading && results.length === 0 && (
            <div className="flex flex-col items-center justify-center py-10 text-gray-400">
              <p className="text-sm">Không tìm thấy kết quả cho <strong className="text-gray-600 dark:text-gray-300">"{query}"</strong></p>
            </div>
          )}

          {results.map((r, i) => (
            <button
              key={r.id}
              onClick={() => navigate(r)}
              className={cn(
                'w-full flex items-start gap-3 px-4 py-3 text-left transition-colors',
                i === cursor
                  ? 'bg-orange-50 dark:bg-orange-500/10'
                  : 'hover:bg-gray-50 dark:hover:bg-gray-800/60'
              )}
            >
              {/* Topic icon */}
              <span className="text-lg shrink-0 mt-0.5">{r.topic_icon ?? '📚'}</span>

              <div className="flex-1 min-w-0">
                {/* Sentence */}
                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                  {r.sample_sentence}
                </p>
                {/* Translation */}
                {r.translation && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate mt-0.5">
                    {r.translation}
                  </p>
                )}
                {/* Topic badge */}
                <div className="flex items-center gap-1 mt-1">
                  <BookOpen className="h-2.5 w-2.5 text-orange-400" />
                  <span className="text-[10px] text-orange-500 font-medium">{r.topic_name}</span>
                  {r.type && (
                    <span className="text-[10px] text-gray-400 ml-1">· {r.type}</span>
                  )}
                </div>
              </div>

              <ArrowRight className={cn(
                'h-3.5 w-3.5 shrink-0 mt-1 transition-opacity',
                i === cursor ? 'text-orange-500 opacity-100' : 'text-gray-300 opacity-0 group-hover:opacity-100'
              )} />
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between px-4 py-2 border-t border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
          <div className="flex items-center gap-3 text-[10px] text-gray-400">
            <span><kbd className="font-mono">↑↓</kbd> điều hướng</span>
            <span><kbd className="font-mono">↵</kbd> mở</span>
            <span><kbd className="font-mono">Esc</kbd> đóng</span>
          </div>
          {results.length > 0 && (
            <span className="text-[10px] text-gray-400">{results.length} kết quả</span>
          )}
        </div>
      </div>
    </div>
  )
}
