'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Search, BookOpen, ArrowRight, Loader2, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { useDebounce } from '@/lib/hooks/useDebounce'

interface SearchResult {
  id:              number
  topic_id:        number
  sample_sentence: string
  translation:     string | null
  pronunciation:   string | null
  type:            string | null
  topic_name:      string
  topic_icon:      string | null
  topic_slug:      string
}

interface GlobalSearchProps {
  open: boolean
  onClose: () => void
}

export function GlobalSearch({ open, onClose }: GlobalSearchProps) {
  const router  = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef  = useRef<HTMLDivElement>(null)

  const [query,   setQuery]   = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [active,  setActive]  = useState(0)  // keyboard-nav index

  const debouncedQuery = useDebounce(query, 200)

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setActive(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Search
  useEffect(() => {
    if (!debouncedQuery.trim()) { setResults([]); return }
    setLoading(true)
    apiFetch<{ results: SearchResult[] }>(`/api/search?q=${encodeURIComponent(debouncedQuery)}&limit=12`)
      .then(d => { setResults(d.results); setActive(0) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [debouncedQuery])

  // Close on Escape / backdrop click
  useEffect(() => {
    if (!open) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive(a => Math.min(a + 1, results.length - 1)) }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setActive(a => Math.max(a - 1, 0)) }
      if (e.key === 'Enter' && results[active]) {
        navigate(results[active])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, active, results])  // eslint-disable-line react-hooks/exhaustive-deps

  const navigate = useCallback((r: SearchResult) => {
    onClose()
    router.push(`/topics/${r.topic_id}`)
  }, [router, onClose])

  // Scroll active item into view
  useEffect(() => {
    const el = listRef.current?.querySelector(`[data-idx="${active}"]`) as HTMLElement | null
    el?.scrollIntoView({ block: 'nearest' })
  }, [active])

  if (!open) return null

  function highlight(text: string, q: string): React.ReactNode {
    if (!q.trim()) return text
    const regex = new RegExp(`(${q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi')
    const parts = text.split(regex)
    return parts.map((part, i) =>
      regex.test(part)
        ? <mark key={i} className="bg-amber-100 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 rounded-[2px] px-0.5">{part}</mark>
        : part
    )
  }

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="fixed left-1/2 top-[12vh] z-50 w-full max-w-xl -translate-x-1/2 rounded-[12px] bg-white dark:bg-[#141414] overflow-hidden"
        style={{ boxShadow: 'rgba(0,0,0,0.25) 0px 8px 40px, rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>

        {/* Input row */}
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
          {loading
            ? <Loader2 className="h-4 w-4 shrink-0 text-[#999] animate-spin" />
            : <Search className="h-4 w-4 shrink-0 text-[#999]" />
          }
          <input
            ref={inputRef}
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Tìm câu hoặc nghĩa..."
            className="flex-1 bg-transparent text-[14px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#bbb] outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="text-[#bbb] hover:text-[#666] transition-colors">
              <X className="h-3.5 w-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center rounded-[4px] border border-[#e8e8e8] dark:border-[#333] px-1.5 py-0.5 text-[10px] font-mono text-[#aaa]">
            Esc
          </kbd>
        </div>

        {/* Results */}
        <div ref={listRef} className="max-h-[60vh] overflow-y-auto">
          {!query.trim() ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Search className="h-8 w-8 text-[#e0e0e0] mb-3" />
              <p className="text-[13px] text-[#bbb]">Gõ để tìm câu hoặc nghĩa</p>
              <p className="text-[11px] text-[#ddd] mt-1">Tìm across tất cả chủ đề</p>
            </div>
          ) : results.length === 0 && !loading ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <p className="text-[13px] text-[#bbb]">Không tìm thấy &ldquo;{query}&rdquo;</p>
            </div>
          ) : (
            <div className="py-1">
              {/* Group by topic */}
              {Object.entries(
                results.reduce<Record<string, SearchResult[]>>((acc, r) => {
                  const key = r.topic_name
                  ;(acc[key] ??= []).push(r)
                  return acc
                }, {})
              ).map(([topicName, items]) => (
                <div key={topicName}>
                  {/* Topic header */}
                  <div className="flex items-center gap-1.5 px-4 py-2 sticky top-0 bg-white dark:bg-[#141414]">
                    <span className="text-[11px]">{items[0].topic_icon ?? '📚'}</span>
                    <span className="text-[10px] font-semibold uppercase tracking-widest text-[#999]">{topicName}</span>
                  </div>
                  {items.map(r => {
                    const idx = results.indexOf(r)
                    return (
                      <button
                        key={r.id}
                        data-idx={idx}
                        onClick={() => navigate(r)}
                        className={cn(
                          'w-full text-left flex items-start gap-3 px-4 py-2.5 transition-colors',
                          idx === active
                            ? 'bg-[#f5f5f5] dark:bg-[#222]'
                            : 'hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]'
                        )}
                        onMouseEnter={() => setActive(idx)}
                      >
                        <BookOpen className="h-3.5 w-3.5 text-[#bbb] shrink-0 mt-0.5" />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">
                            {highlight(r.sample_sentence, query)}
                          </p>
                          {r.translation && (
                            <p className="text-[11px] text-[#999] truncate mt-0.5">
                              {highlight(r.translation, query)}
                            </p>
                          )}
                        </div>
                        <ArrowRight className="h-3.5 w-3.5 text-[#ddd] shrink-0 mt-0.5 opacity-0 group-hover:opacity-100" />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer hint */}
        {results.length > 0 && (
          <div className="flex items-center justify-between px-4 py-2 border-t border-[#f0f0f0] dark:border-[#2a2a2a]">
            <span className="text-[10px] text-[#ccc]">{results.length} kết quả</span>
            <div className="flex items-center gap-3 text-[10px] text-[#ccc]">
              <span><kbd className="font-mono">↑↓</kbd> di chuyển</span>
              <span><kbd className="font-mono">↵</kbd> mở topic</span>
            </div>
          </div>
        )}
      </div>
    </>
  )
}
