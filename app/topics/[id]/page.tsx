'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams, useRouter } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { PhraseForm } from '@/components/phrases/PhraseForm'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { BulkAddModal } from '@/components/phrases/BulkAddModal'
import { FlashcardView } from '@/components/phrases/FlashcardView'
import {
  BookOpen, Search, Pencil, Trash2, Volume2, Sparkles, Eye, Filter, MoreVertical,
  ChevronLeft, ChevronRight, ChevronDown,
  List, GalleryHorizontal, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import type { Topic, Phrase } from '@/db/schema'

const PAGE_SIZE = 10  // desktop

/* ── Utils ── */
async function fetchTopic(id: string): Promise<Topic> {
  const res = await fetch(`/api/topics/${id}`)
  if (!res.ok) throw new Error('Not found')
  return res.json()
}

async function fetchPhrases(topicId: string): Promise<Phrase[]> {
  const res = await fetch(`/api/phrases?topic_id=${topicId}`)
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

function speak(text: string) {
  const utter = new SpeechSynthesisUtterance(text)
  utter.lang = 'en-US'
  speechSynthesis.speak(utter)
}

/** Parse "Greeting,Inviting" → ["Greeting", "Inviting"] */
function parseTypes(type: string | null): string[] {
  if (!type) return []
  return type.split(',').map(t => t.trim()).filter(Boolean)
}

const TYPE_STYLE: Record<string, string> = {
  Asking: 'bg-blue-50 text-blue-600 border-blue-100 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  Responding: 'bg-green-50 text-green-600 border-green-100 dark:bg-green-900/30 dark:text-green-300 dark:border-green-800',
  Greeting: 'bg-purple-50 text-purple-600 border-purple-100 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  Expressing: 'bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-800',
  Inviting: 'bg-rose-50 text-rose-600 border-rose-100 dark:bg-rose-900/30 dark:text-rose-300 dark:border-rose-800',
  Instructing: 'bg-teal-50 text-teal-600 border-teal-100 dark:bg-teal-900/30 dark:text-teal-300 dark:border-teal-800',
  Requesting: 'bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-800',
  Directing: 'bg-indigo-50 text-indigo-600 border-indigo-100 dark:bg-indigo-900/30 dark:text-indigo-300 dark:border-indigo-800',
  Introducing: 'bg-fuchsia-50 text-fuchsia-600 border-fuchsia-100 dark:bg-fuchsia-900/30 dark:text-fuchsia-300 dark:border-fuchsia-800',
}

function TypeBadge({ type }: { type: string }) {
  const cls = TYPE_STYLE[type] ?? 'bg-gray-50 text-gray-500 border-gray-200 dark:bg-gray-800 dark:text-gray-400 dark:border-gray-700'
  return (
    <span className={`inline-flex items-center rounded-full border px-1.5 py-0.5 text-[11px] font-medium whitespace-nowrap ${cls}`}>
      {type}
    </span>
  )
}

function TypeBadges({ type }: { type: string | null }) {
  const types = parseTypes(type)
  if (!types.length) return <span className="text-gray-300 text-xs">—</span>
  return (
    <div className="flex flex-wrap gap-1">
      {types.map(t => <TypeBadge key={t} type={t} />)}
    </div>
  )
}

/* ── Structure renderer: highlight (variable) parts ── */
function StructureText({ text }: { text: string }) {
  const parts = text.split(/(\([^)]+\))/g)
  return (
    <span className="text-xs font-mono">
      {parts.map((part, i) =>
        part.startsWith('(') && part.endsWith(')') ? (
          <span key={i} className="mx-0.5 rounded bg-orange-100 px-1 text-orange-600 font-semibold">{part}</span>
        ) : (
          <span key={i} className="text-gray-700">{part}</span>
        )
      )}
    </span>
  )
}

/* ── Phrase View Dialog (light theme) ── */
function PhraseViewDialog({ phrase, open, onClose }: { phrase: Phrase | null; open: boolean; onClose: () => void }) {
  if (!phrase) return null
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-white border-gray-200 text-gray-900 max-h-[90vh] overflow-y-auto shadow-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-gray-900">
            <Eye className="h-4 w-4 text-orange-500" />
            Chi tiết câu
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Sample sentence */}
          <div className="rounded-xl bg-orange-50 border border-orange-100 p-4">
            <p className="text-[10px] uppercase tracking-wider text-orange-400 mb-1.5">Câu mẫu</p>
            <div className="flex items-center gap-2">
              <button onClick={() => speak(phrase.sample_sentence)} className="text-orange-400 hover:text-orange-600 shrink-0">
                <Volume2 className="h-4 w-4" />
              </button>
              <p className="text-xl font-bold text-gray-900">{phrase.sample_sentence}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Translation */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Dịch nghĩa</p>
              <p className="text-gray-700 font-medium">{phrase.translation || '—'}</p>
            </div>
            {/* IPA */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Phát âm IPA</p>
              <p className="font-mono text-orange-600">{phrase.pronunciation || '—'}</p>
            </div>
            {/* Type */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Loại câu</p>
              <TypeBadges type={phrase.type} />
            </div>
            {/* Function */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-1">Chức năng</p>
              <p className="text-gray-600 text-sm">{phrase.function || '—'}</p>
            </div>
          </div>

          {/* Structure */}
          {phrase.structure && (
            <div className="rounded-xl bg-gray-50 border border-gray-200 p-4">
              <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Cấu trúc ngữ pháp</p>
              <p className="text-sm leading-relaxed">
                <StructureText text={phrase.structure} />
              </p>
              <p className="mt-2 text-[10px] text-gray-400 italic">
                Phần <span className="text-orange-500 font-semibold">cam</span> = có thể thay đổi linh hoạt
              </p>
            </div>
          )}

          {/* Examples */}
          {(phrase.example1 || phrase.example2) && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-gray-400">Ví dụ</p>
              {[
                { ex: phrase.example1, tr: phrase.example1_translation, ipa: phrase.example1_pronunciation, n: 1 },
                { ex: phrase.example2, tr: phrase.example2_translation, ipa: phrase.example2_pronunciation, n: 2 },
              ].filter(e => e.ex).map(e => (
                <div key={e.n} className="rounded-lg bg-gray-50 p-3 space-y-1 border border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[9px] font-bold text-orange-500">{e.n}</span>
                    <button onClick={() => speak(e.ex!)} className="text-gray-400 hover:text-orange-500 ml-auto">
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-gray-800 italic">{e.ex}</p>
                  {e.tr && <p className="text-xs text-gray-500">{e.tr}</p>}
                  {e.ipa && <p className="font-mono text-xs text-orange-500">{e.ipa}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

/* ════════════════════════════════════════════════════════════ */
export default function TopicPage() {
  const params = useParams<{ id: string }>()
  const router = useRouter()
  const queryClient = useQueryClient()

  /* ── UI state ── */
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [editPhrase, setEditPhrase] = useState<Phrase | undefined>()
  const [viewPhrase, setViewPhrase] = useState<Phrase | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  const [selected, setSelected] = useState<Set<number>>(new Set())
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const [mobileFilterOpen, setMobileFilterOpen] = useState(false)
  const [showAllMobile, setShowAllMobile] = useState(false)
  const [layoutMode, setLayoutMode] = useState<'list' | 'flashcard'>('list')
  const MOBILE_INITIAL = 10
  const [activeCardMenu, setActiveCardMenu] = useState<number | null>(null)
  const filterRef = useRef<HTMLDivElement>(null)
  const mobileFilterRef = useRef<HTMLDivElement>(null)

  /* close dropdowns on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
      if (mobileFilterRef.current && !mobileFilterRef.current.contains(e.target as Node)) setMobileFilterOpen(false)
      setActiveCardMenu(null)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleExpand = (id: number) => {
    setExpanded(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }

  /* ── Data ── */
  const { data: topic, isLoading: topicLoading } = useQuery({
    queryKey: ['topic', params.id],
    queryFn: () => fetchTopic(params.id),
  })

  const { data: phrases, isLoading: phrasesLoading } = useQuery({
    queryKey: ['phrases', parseInt(params.id)],
    queryFn: () => fetchPhrases(params.id),
  })

  /* ── Mutations ── */
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/phrases/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error('Delete failed')
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phrases', parseInt(params.id)] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success('Đã xóa câu!')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const bulkDeleteMutation = useMutation({
    mutationFn: async (ids: number[]) => {
      const res = await fetch('/api/phrases/bulk-delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ids }),
      })
      if (!res.ok) throw new Error('Bulk delete failed')
      return res.json()
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['phrases', parseInt(params.id)] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      setSelected(new Set())
      toast.success(`Đã xóa ${data.count} câu!`)
    },
    onError: () => toast.error('Xóa hàng loạt thất bại'),
  })

  /* ── Derived state ── */
  // All unique individual types across all phrases
  const availableTypes = useMemo(() => {
    const s = new Set<string>()
    phrases?.forEach(p => parseTypes(p.type).forEach(t => s.add(t)))
    return [...s].sort()
  }, [phrases])

  const filtered = useMemo(() =>
    phrases?.filter(p => {
      const lo = search.toLowerCase()
      const matchSearch = !search ||
        p.sample_sentence.toLowerCase().includes(lo) ||
        p.translation?.toLowerCase().includes(lo) ||
        p.type?.toLowerCase().includes(lo)
      const phraseTypes = parseTypes(p.type)
      const matchType = typeFilter.size === 0 || phraseTypes.some(t => typeFilter.has(t))
      return matchSearch && matchType
    }) ?? [], [phrases, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Mobile: show first 10 or all
  const mobileVisible = showAllMobile ? filtered : filtered.slice(0, MOBILE_INITIAL)
  const hasMoreMobile = filtered.length > MOBILE_INITIAL && !showAllMobile
  const pageIds = paginated.map(p => p.id)
  const allPageSel = pageIds.length > 0 && pageIds.every(id => selected.has(id))

  /* ── Handlers ── */
  const openEdit = (p: Phrase) => { setEditPhrase(p); setDialogOpen(true) }

  const handleSearchChange = (v: string) => { setSearch(v); setPage(1) }

  const toggleOne = (id: number) => {
    setSelected(prev => { const n = new Set(prev); n.has(id) ? n.delete(id) : n.add(id); return n })
  }
  const toggleAllPage = () => {
    setSelected(prev => {
      const n = new Set(prev)
      allPageSel ? pageIds.forEach(id => n.delete(id)) : pageIds.forEach(id => n.add(id))
      return n
    })
  }
  const toggleTypeFilter = (t: string) => {
    setTypeFilter(prev => { const n = new Set(prev); n.has(t) ? n.delete(t) : n.add(t); return n })
    setPage(1)
  }
  const clearTypeFilter = () => { setTypeFilter(new Set()); setPage(1) }

  const handleBulkDelete = () => {
    const ids = [...selected]
    if (!ids.length) return
    if (!confirm(`Xóa ${ids.length} câu đã chọn? (xóa mềm)`)) return
    bulkDeleteMutation.mutate(ids)
  }

  /* ════════════════════════════════ */
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-16 pr-4 py-3 md:px-8 md:py-4">
          <div className="flex items-center justify-between">
            {topicLoading ? (
              <Skeleton className="h-6 w-40 bg-gray-100" />
            ) : (
              <div className="flex items-center gap-2.5">
                <span className="text-2xl">{topic?.icon}</span>
                <div>
                  <h1 className="text-base md:text-lg font-bold text-gray-900">{topic?.name}</h1>
                  {topic?.description && <p className="text-xs text-gray-400 mt-0.5 hidden sm:block">{topic.description}</p>}
                </div>
              </div>
            )}
            <button
              onClick={() => router.push('/')}
              className="flex items-center gap-1.5 h-8 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 hover:text-gray-800 dark:hover:text-gray-200 transition-colors shadow-sm px-2.5 text-xs font-medium shrink-0"
              title="Quay lại danh sách chủ đề"
            >
              <ChevronLeft className="h-4 w-4" />
              <span className="hidden sm:inline">Quay lại</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* Mobile: search + filter + add in gray area */}
          <div className="flex md:hidden items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm câu..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-8 h-9 w-full border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:border-orange-400 shadow-sm"
              />
            </div>
            {/* Mobile filter button */}
            {availableTypes.length > 0 && (
              <div ref={mobileFilterRef} className="relative">
                <button
                  onClick={() => setMobileFilterOpen(o => !o)}
                  className={cn(
                    'flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-colors',
                    typeFilter.size > 0
                      ? 'border-orange-500 bg-orange-50 text-orange-600'
                      : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
                  )}
                >
                  <Filter className="h-4 w-4" />
                  {typeFilter.size > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[9px] font-bold text-white">
                      {typeFilter.size}
                    </span>
                  )}
                </button>
                {mobileFilterOpen && (
                  <div className="absolute right-0 top-11 z-50 min-w-[190px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                    <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-gray-100">
                      <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Loại câu</span>
                      {typeFilter.size > 0 && (
                        <button onClick={clearTypeFilter} className="text-[11px] text-orange-500 hover:text-orange-700 font-medium">Xóa tất cả</button>
                      )}
                    </div>
                    {availableTypes.map(type => {
                      const count = phrases?.filter(p => parseTypes(p.type).includes(type)).length ?? 0
                      const checked = typeFilter.has(type)
                      return (
                        <label key={type} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" checked={checked} onChange={() => toggleTypeFilter(type)} className="h-3.5 w-3.5 rounded accent-orange-500" />
                          <TypeBadge type={type} />
                          <span className="ml-auto text-[11px] text-gray-400">{count}</span>
                        </label>
                      )
                    })}
                  </div>
                )}
              </div>
            )}
            <button
              onClick={() => setBulkAddOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white hover:bg-orange-700 shrink-0 shadow-sm"
              title="Thêm nhiều câu"
            >
              <Sparkles className="h-4 w-4" />
            </button>
            {/* Layout toggle - mobile */}
            <button
              onClick={() => setLayoutMode(m => m === 'list' ? 'flashcard' : 'list')}
              className={cn(
                'flex h-9 w-9 items-center justify-center rounded-lg border shadow-sm transition-colors shrink-0',
                layoutMode === 'flashcard'
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-gray-200 bg-white text-gray-500 hover:border-gray-300'
              )}
              title={layoutMode === 'flashcard' ? 'Xem danh sách' : 'Xem flashcard'}
            >
              {layoutMode === 'flashcard' ? <List className="h-4 w-4" /> : <GalleryHorizontal className="h-4 w-4" />}
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 bg-white shadow-sm hidden md:block">

            {/* ── Toolbar – desktop only ── */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100 relative z-10">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800">Danh sách câu</h2>
                {!phrasesLoading && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                    {filtered.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2.5">
                {/* Search */}
                <div className="relative w-56">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Tìm câu, dịch nghĩa..."
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="pl-9 h-8 border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:border-orange-400"
                  />
                </div>

                {/* Filter dropdown */}
                {availableTypes.length > 0 && (
                  <div ref={filterRef} className="relative">
                    <button
                      onClick={() => setFilterOpen(o => !o)}
                      className={cn(
                        'flex items-center gap-1.5 h-8 rounded-lg border px-3 text-xs font-medium transition-colors',
                        typeFilter.size > 0
                          ? 'border-orange-500 bg-orange-50 text-orange-700'
                          : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:text-gray-800'
                      )}
                    >
                      <Filter className="h-3 w-3" />
                      Lọc loại
                      {typeFilter.size > 0 && (
                        <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500 text-[10px] font-bold text-white">
                          {typeFilter.size}
                        </span>
                      )}
                    </button>

                    {filterOpen && (
                      <div className="absolute left-0 top-full mt-1 z-50 min-w-[190px] rounded-xl border border-gray-200 bg-white p-2 shadow-xl">
                        <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-gray-100">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Loại câu</span>
                          {typeFilter.size > 0 && (
                            <button onClick={clearTypeFilter} className="text-[11px] text-orange-500 hover:text-orange-700 font-medium">
                              Xóa tất cả
                            </button>
                          )}
                        </div>
                        {availableTypes.map(type => {
                          const count = phrases?.filter(p => parseTypes(p.type).includes(type)).length ?? 0
                          const checked = typeFilter.has(type)
                          return (
                            <label key={type} className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-50">
                              <input
                                type="checkbox"
                                checked={checked}
                                onChange={() => toggleTypeFilter(type)}
                                className="h-3.5 w-3.5 rounded accent-orange-500"
                              />
                              <TypeBadge type={type} />
                              <span className="ml-auto text-[11px] text-gray-400">{count}</span>
                            </label>
                          )
                        })}
                      </div>
                    )}
                  </div>
                )}

                {/* Nhiều câu */}
                <Button
                  variant="outline"
                  onClick={() => setBulkAddOpen(true)}
                  className="h-8 text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:text-gray-900 text-xs"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
                  Nhiều câu
                </Button>
                {/* Layout toggle - desktop */}
                <div className="flex items-center rounded-lg border border-gray-200 bg-gray-50 p-0.5 gap-0.5">
                  <button
                    onClick={() => setLayoutMode('list')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      layoutMode === 'list' ? 'bg-white text-gray-700 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    )}
                    title="Danh sách"
                  >
                    <List className="h-3.5 w-3.5" /> Danh sách
                  </button>
                  <button
                    onClick={() => setLayoutMode('flashcard')}
                    className={cn(
                      'flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors',
                      layoutMode === 'flashcard' ? 'bg-white text-orange-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'
                    )}
                    title="Flashcard"
                  >
                    <GalleryHorizontal className="h-3.5 w-3.5" /> Flashcard
                  </button>
                </div>
              </div>
            </div>

            {/* ── Bulk action bar ── */}
            {selected.size > 0 && (
              <div className="flex items-center justify-between px-6 py-2.5 bg-red-50 border-b border-red-100">
                <span className="text-sm font-medium text-red-700">
                  Đã chọn <span className="font-bold">{selected.size}</span> câu
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700">
                    Bỏ chọn
                  </button>
                  <Button
                    size="sm"
                    onClick={handleBulkDelete}
                    disabled={bulkDeleteMutation.isPending}
                    className="h-7 bg-red-500 hover:bg-red-600 text-white text-xs"
                  >
                    <Trash2 className="mr-1 h-3 w-3" />
                    {bulkDeleteMutation.isPending ? 'Đang xóa...' : `Xóa ${selected.size} câu`}
                  </Button>
                </div>
              </div>
            )}
          </div>{/* end desktop toolbar container */}

          {/* ── Flashcard mode ── */}
          {layoutMode === 'flashcard' && <FlashcardView phrases={filtered} />}

          {/* ── Mobile: card list ── */}
          {layoutMode === 'list' && <div className="md:hidden space-y-2">
            {phrasesLoading ? (
              [...Array(5)].map((_, i) => (
                <div key={i} className="rounded-xl border border-gray-200 bg-white p-4">
                  <Skeleton className="h-5 w-3/4 bg-gray-100 mb-2" />
                  <Skeleton className="h-4 w-1/2 bg-gray-100 mb-2" />
                  <Skeleton className="h-3 w-1/3 bg-gray-100" />
                </div>
              ))
            ) : mobileVisible.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="mb-4 rounded-full bg-gray-100 p-5">
                  <BookOpen className="h-8 w-8 text-gray-300" />
                </div>
                <p className="text-sm font-medium text-gray-400">
                  {search ? `Không tìm thấy kết quả cho "${search}"` : 'Chưa có câu nào — thêm câu đầu tiên!'}
                </p>
                {!search && (
                  <Button onClick={() => setBulkAddOpen(true)} size="sm" className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">
                    <Sparkles className="mr-1.5 h-3.5 w-3.5" /> Thêm câu
                  </Button>
                )}
              </div>
            ) : (
              <>
                {mobileVisible.map(phrase => {
                  const hasExamples = phrase.example1 || phrase.example2
                  const isOpen = expanded.has(phrase.id)
                  return (
                    <div key={phrase.id} className="group relative rounded-xl border border-gray-200 bg-white p-4 shadow-sm hover:shadow transition-shadow">
                      {/* Kebab – absolute top-right */}
                      <div className="absolute top-3 right-3 shrink-0">
                        <button
                          onClick={e => { e.stopPropagation(); setActiveCardMenu(activeCardMenu === phrase.id ? null : phrase.id) }}
                          className="p-1 rounded-lg text-gray-400 hover:bg-gray-100 transition-colors"
                        >
                          <MoreVertical className="h-4 w-4" />
                        </button>
                        {activeCardMenu === phrase.id && (
                          <div
                            className="absolute right-0 top-7 z-50 min-w-[130px] rounded-xl border border-gray-200 bg-white shadow-lg py-1"
                            onClick={e => e.stopPropagation()}
                          >
                            <button
                              onClick={() => { openEdit(phrase); setActiveCardMenu(null) }}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50"
                            >
                              <Pencil className="h-3.5 w-3.5 text-gray-400" />
                              Chỉnh sửa
                            </button>
                            <button
                              onClick={() => { if (confirm('Xóa câu này?')) { deleteMutation.mutate(phrase.id); setActiveCardMenu(null) } }}
                              disabled={deleteMutation.isPending}
                              className="flex w-full items-center gap-2 px-3 py-2 text-sm text-red-500 hover:bg-red-50 disabled:opacity-50"
                            >
                              {deleteMutation.isPending
                                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                : <Trash2 className="h-3.5 w-3.5" />}
                              Xóa
                            </button>
                          </div>
                        )}
                      </div>

                      {/* Content */}
                      <div className="flex items-start gap-1.5 min-w-0 pr-8">
                        <button
                          onClick={() => speak(phrase.sample_sentence)}
                          className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors mt-0.5"
                        >
                          <Volume2 className="h-3.5 w-3.5" />
                        </button>
                        <div className="min-w-0">
                          <p className="font-semibold text-gray-900 leading-snug">{phrase.sample_sentence}</p>
                          <p className="text-sm text-gray-500 mt-0.5">{phrase.translation ?? '—'}</p>
                          {phrase.pronunciation && (
                            <p className="text-xs font-mono text-orange-500 mt-0.5">{phrase.pronunciation}</p>
                          )}
                        </div>
                      </div>

                      {/* Bottom row: Ví dụ (left) + TypeBadges (right) */}
                      <div className="flex items-center justify-between mt-2">
                        {hasExamples ? (
                          <button
                            onClick={() => toggleExpand(phrase.id)}
                            className="flex items-center gap-1 text-xs text-gray-400 hover:text-orange-500 transition-colors"
                          >
                            {isOpen ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
                            Ví dụ
                          </button>
                        ) : <div />}
                        <TypeBadges type={phrase.type} />
                      </div>

                      {/* Examples expanded */}
                      {isOpen && hasExamples && (
                        <div className="mt-2 pt-2 border-t border-gray-100 space-y-1.5">
                          {[
                            { ex: phrase.example1, tr: phrase.example1_translation, n: 1 },
                            { ex: phrase.example2, tr: phrase.example2_translation, n: 2 },
                          ].filter(e => e.ex).map(e => (
                            <div key={e.n} className="flex items-start gap-2 pl-2">
                              <span className="text-[10px] font-bold text-gray-300 mt-0.5 shrink-0">VD{e.n}</span>
                              <div className="min-w-0">
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => speak(e.ex!)}
                                    className="text-gray-300 hover:text-blue-500 transition-colors shrink-0"
                                  >
                                    <Volume2 className="h-3 w-3" />
                                  </button>
                                  <p className="text-xs text-gray-600 italic">{e.ex}</p>
                                </div>
                                {e.tr && <p className="text-xs text-gray-400 ml-4">{e.tr}</p>}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )
                })}

                {/* Load more */}
                {hasMoreMobile && (
                  <button
                    onClick={() => setShowAllMobile(true)}
                    className="w-full py-3 rounded-xl border border-dashed border-gray-200 text-sm font-medium text-orange-600 hover:bg-orange-50 hover:border-orange-200 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <ChevronDown className="h-4 w-4" />
                    Xem tất cả {filtered.length} câu
                  </button>
                )}
              </>
            )}
          </div>}

          {/* ── Desktop: Table + Pagination ── */}
          <div className={layoutMode === 'list' ? '' : 'hidden'}>
            <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm hidden md:block">
              <div className="overflow-x-auto">
                <table className="w-full text-sm table-fixed">
                  <colgroup><col className="w-[4%]" /><col className="w-[3%]" /><col className="w-[28%]" /><col className="w-[22%]" /><col className="w-[17%]" /><col className="w-[18%]" /><col className="w-[8%]" /></colgroup>
                  <thead>
                    <tr className="border-b border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900">
                      <th className="py-3 w-10 text-center align-middle"><input type="checkbox" checked={allPageSel} onChange={toggleAllPage} className="h-3.5 w-3.5 rounded border-gray-300 accent-orange-500 cursor-pointer" /></th>
                      <th className="py-3 w-8" />
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Câu mẫu</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dịch nghĩa</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Phiên âm</th>
                      <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Loại</th>
                      <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phrasesLoading ? (
                      [...Array(5)].map((_, i) => (
                        <tr key={i} className="border-b border-gray-100">
                          {[...Array(6)].map((_, j) => (
                            <td key={j} className="px-4 py-3"><Skeleton className="h-4 w-full bg-gray-100" /></td>
                          ))}
                        </tr>
                      ))
                    ) : paginated.length === 0 ? (
                      <tr><td colSpan={6}>
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="mb-4 rounded-full bg-gray-100 p-5"><BookOpen className="h-8 w-8 text-gray-300" /></div>
                          <p className="text-sm font-medium text-gray-400">
                            {search ? `Không tìm thấy kết quả cho "${search}"` : 'Chưa có câu nào — thêm câu đầu tiên!'}
                          </p>
                          {!search && (<Button onClick={() => setBulkAddOpen(true)} size="sm" className="mt-4 bg-orange-600 hover:bg-orange-700 text-white"><Sparkles className="mr-1.5 h-3.5 w-3.5" /> Thêm câu</Button>)}
                        </div>
                      </td></tr>
                    ) : (
                      paginated.map(phrase => {
                        const isOpen = expanded.has(phrase.id)
                        const isSel = selected.has(phrase.id)
                        const hasExamples = phrase.example1 || phrase.example2
                        return (
                          <React.Fragment key={phrase.id}>
                            <tr className={cn(
                              'group border-b border-gray-100 transition-colors even:bg-gray-50/70',
                              isSel ? 'bg-orange-50/60 even:bg-orange-50/60' : isOpen ? 'bg-orange-50/30 even:bg-orange-50/30' : 'hover:bg-gray-100/60'
                            )}>
                              <td className="w-10 text-center" onClick={e => e.stopPropagation()}>
                                <input type="checkbox" checked={isSel} onChange={() => toggleOne(phrase.id)} className="h-3.5 w-3.5 rounded border-gray-300 accent-orange-500 cursor-pointer" />
                              </td>
                              <td className="w-8 pl-1 cursor-pointer" onClick={() => hasExamples && toggleExpand(phrase.id)}>
                                {hasExamples && (
                                  <span className="text-gray-300 group-hover:text-gray-500 transition-colors">
                                    {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  </span>
                                )}
                              </td>
                              <td className="px-4 py-3 max-w-0 overflow-hidden">
                                <div className="flex items-center gap-1.5 min-w-0">
                                  <button onClick={e => { e.stopPropagation(); speak(phrase.sample_sentence) }} className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"><Volume2 className="h-3.5 w-3.5" /></button>
                                  <p className="font-semibold text-gray-900 truncate">{phrase.sample_sentence}</p>
                                </div>
                              </td>
                              <td className="px-4 py-3 max-w-0 overflow-hidden"><p className="text-gray-500 text-sm truncate">{phrase.translation ?? '—'}</p></td>
                              <td className="px-4 py-3 max-w-0 overflow-hidden"><span className="font-mono text-xs text-orange-500 block truncate">{phrase.pronunciation ?? '—'}</span></td>
                              <td className="px-4 py-3"><TypeBadges type={phrase.type} /></td>
                              <td className="px-6 py-3" onClick={e => e.stopPropagation()}>
                                <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button onClick={() => setViewPhrase(phrase)} className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Xem chi tiết"><Eye className="h-3.5 w-3.5" /></button>
                                  <button onClick={() => openEdit(phrase)} className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Chỉnh sửa"><Pencil className="h-3.5 w-3.5" /></button>
                                  <button
                                    onClick={() => { if (confirm('Xóa câu này?')) deleteMutation.mutate(phrase.id) }}
                                    disabled={deleteMutation.isPending}
                                    className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-40"
                                    title="Xóa"
                                  >
                                    {deleteMutation.isPending
                                      ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                      : <Trash2 className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                              </td>
                            </tr>
                            {isOpen && (
                              <>
                                {[
                                  { ex: phrase.example1, tr: phrase.example1_translation, n: 1 },
                                  { ex: phrase.example2, tr: phrase.example2_translation, n: 2 },
                                ].filter(e => e.ex).map(e => (
                                  <tr key={`ex-${phrase.id}-${e.n}`} className="border-b border-gray-50 bg-orange-50/20">
                                    <td className="w-10 pl-5" />
                                    <td className="w-8 pl-2"><div className="flex items-center gap-1"><div className="w-3 h-px bg-gray-200" /><span className="text-[10px] font-semibold text-gray-300">VD{e.n}</span></div></td>
                                    <td className="px-4 py-2"><div className="flex items-center gap-1.5 min-w-0"><button onClick={ev => { ev.stopPropagation(); speak(e.ex!) }} className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors"><Volume2 className="h-3 w-3" /></button><p className="text-gray-600 text-xs italic truncate">{e.ex}</p></div></td>
                                    <td className="px-4 py-2"><p className="text-gray-400 text-xs truncate">{e.tr}</p></td>
                                    <td className="px-4 py-2" /><td className="px-4 py-2" />
                                  </tr>
                                ))}
                              </>
                            )}
                          </React.Fragment>
                        )
                      })
                    )}
                  </tbody>
                </table>
                {/* Desktop pagination */}
                {!phrasesLoading && totalPages > 1 && (
                  <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                    <p className="text-xs text-gray-400">Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} câu</p>
                    <div className="flex items-center gap-1">
                      <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronLeft className="h-4 w-4" /></button>
                      {[...Array(totalPages)].map((_, i) => (
                        <button key={i} onClick={() => setPage(i + 1)} className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${currentPage === i + 1 ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-100'}`}>{i + 1}</button>
                      ))}
                      <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed"><ChevronRight className="h-4 w-4" /></button>
                    </div>
                  </div>
                )}
              </div>{/* end overflow-x-auto */}
            </div>{/* end desktop table container */}
          </div>{/* end list mode wrapper */}
        </div>{/* end flex-1 scroll area */}
      </main>

      {/* Edit/Add Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-5xl border-white/10 bg-slate-900 text-white">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-white">
              {editPhrase ? '✏️ Chỉnh sửa câu' : '✨ Thêm câu mới'}
            </DialogTitle>
          </DialogHeader>
          {topic && (
            <PhraseForm
              topicId={topic.id}
              topicName={topic.name}
              editPhrase={editPhrase}
              onSuccess={() => setDialogOpen(false)}
              onCancel={() => setDialogOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>

      {/* View Dialog (light) */}
      <PhraseViewDialog
        phrase={viewPhrase}
        open={!!viewPhrase}
        onClose={() => setViewPhrase(null)}
      />

      {/* Bulk Add + AI Review Modal */}
      {topic && (
        <BulkAddModal
          open={bulkAddOpen}
          onOpenChange={setBulkAddOpen}
          topicId={topic.id}
          topicName={topic.name}
          onSuccess={() => {
            queryClient.invalidateQueries({ queryKey: ['phrases', parseInt(params.id)] })
            queryClient.invalidateQueries({ queryKey: ['topics'] })
          }}
        />
      )}
    </div>
  )
}
