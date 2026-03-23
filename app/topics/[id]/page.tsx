'use client'

import React, { useState, useMemo, useRef, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { PhraseForm } from '@/components/phrases/PhraseForm'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import { BulkAddModal } from '@/components/phrases/BulkAddModal'
import {
  Plus, BookOpen, Search, Pencil, Trash2, Volume2, Sparkles, Eye, Filter,
  ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon, X
} from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

import type { Topic, Phrase } from '@/db/schema'

const PAGE_SIZE = 10

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

const TYPE_STYLE: Record<string, string> = {
  Asking:     'bg-blue-50 text-blue-600 border-blue-100',
  Responding: 'bg-green-50 text-green-600 border-green-100',
  Greeting:   'bg-purple-50 text-purple-600 border-purple-100',
  Expressing: 'bg-amber-50 text-amber-600 border-amber-100',
}

function TypeBadge({ type }: { type: string | null }) {
  const cls = type ? (TYPE_STYLE[type] ?? 'bg-gray-50 text-gray-500 border-gray-100') : 'bg-gray-50 text-gray-400 border-gray-100'
  return (
    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${cls}`}>
      {type ?? '—'}
    </span>
  )
}

/* ── Structure renderer: highlight (variable) parts ── */
function StructureText({ text }: { text: string }) {
  // Split on words inside () preserving delimiters
  const parts = text.split(/(\([^)]+\))/g)
  return (
    <span className="text-xs font-mono">
      {parts.map((part, i) =>
        part.startsWith('(') && part.endsWith(')') ? (
          <span key={i} className="mx-0.5 rounded bg-orange-100 px-1 text-orange-600 font-semibold">{part}</span>
        ) : (
          <span key={i} className="text-gray-600">{part}</span>
        )
      )}
    </span>
  )
}

/* ── Phrase View Dialog ── */
function PhraseViewDialog({ phrase, open, onClose }: { phrase: Phrase | null; open: boolean; onClose: () => void }) {
  if (!phrase) return null
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl bg-slate-900 border-white/10 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Eye className="h-4 w-4 text-orange-400" />
            Chi tiết câu
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 pt-1">
          {/* Sample sentence */}
          <div>
            <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Câu mẫu</p>
            <div className="flex items-center gap-2">
              <button onClick={() => speak(phrase.sample_sentence)} className="text-slate-400 hover:text-blue-400">
                <Volume2 className="h-4 w-4" />
              </button>
              <p className="text-lg font-bold text-white">{phrase.sample_sentence}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {/* Translation */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Dịch nghĩa</p>
              <p className="text-slate-200">{phrase.translation || '—'}</p>
            </div>
            {/* IPA */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Phát âm IPA</p>
              <p className="font-mono text-orange-400">{phrase.pronunciation || '—'}</p>
            </div>
            {/* Type */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Loại câu</p>
              <TypeBadge type={phrase.type} />
            </div>
            {/* Function */}
            <div>
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-1">Chức năng</p>
              <p className="text-slate-300 text-sm">{phrase.function || '—'}</p>
            </div>
          </div>

          {/* Structure */}
          {phrase.structure && (
            <div className="rounded-xl bg-slate-800/60 border border-white/5 p-4">
              <p className="text-[10px] uppercase tracking-wider text-slate-500 mb-2">Cấu trúc ngữ pháp</p>
              <p className="text-sm leading-relaxed">
                <StructureText text={phrase.structure} />
              </p>
              <p className="mt-2 text-[10px] text-slate-600 italic">Phần in <span className="text-orange-400 font-semibold">cam</span> = có thể thay đổi linh hoạt</p>
            </div>
          )}

          {/* Examples */}
          {(phrase.example1 || phrase.example2) && (
            <div className="space-y-2">
              <p className="text-[10px] uppercase tracking-wider text-slate-500">Ví dụ</p>
              {[
                { ex: phrase.example1, tr: phrase.example1_translation, ipa: phrase.example1_pronunciation, n: 1 },
                { ex: phrase.example2, tr: phrase.example2_translation, ipa: phrase.example2_pronunciation, n: 2 },
              ].filter(e => e.ex).map(e => (
                <div key={e.n} className="rounded-lg bg-slate-800/60 p-3 space-y-1 border border-white/5">
                  <div className="flex items-center gap-2">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-500/20 text-[9px] font-bold text-orange-300">{e.n}</span>
                    <button onClick={() => speak(e.ex!)} className="text-slate-400 hover:text-blue-400 ml-auto">
                      <Volume2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                  <p className="text-sm text-white italic">{e.ex}</p>
                  {e.tr  && <p className="text-xs text-slate-400">{e.tr}</p>}
                  {e.ipa && <p className="font-mono text-xs text-orange-400">{e.ipa}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}

export default function TopicPage() {
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [bulkAddOpen, setBulkAddOpen] = useState(false)
  const [editPhrase, setEditPhrase] = useState<Phrase | undefined>()
  const [viewPhrase, setViewPhrase] = useState<Phrase | null>(null)
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())
  // Multi-select
  const [selected, setSelected] = useState<Set<number>>(new Set())
  // Type filter — multi-select
  const [typeFilter, setTypeFilter] = useState<Set<string>>(new Set())
  const [filterOpen, setFilterOpen] = useState(false)
  const filterRef = useRef<HTMLDivElement>(null)

  /* close dropdown on outside click */
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const toggleExpand = (id: number) => {
    setExpanded((prev) => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

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
  // Collect unique types from all phrases (not just current page)
  const availableTypes = useMemo(() => {
    const types = new Set(phrases?.map(p => p.type).filter(Boolean) as string[])
    return [...types].sort()
  }, [phrases])

  const filtered = useMemo(() =>
    phrases?.filter((p) => {
      const matchesSearch = search
        ? p.sample_sentence.toLowerCase().includes(search.toLowerCase()) ||
          p.translation?.toLowerCase().includes(search.toLowerCase()) ||
          p.type?.toLowerCase().includes(search.toLowerCase())
        : true
      const matchesType = typeFilter.size === 0 || (p.type != null && typeFilter.has(p.type))
      return matchesSearch && matchesType
    }) ?? [], [phrases, search, typeFilter])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const pageIds = paginated.map(p => p.id)
  const allPageSelected = pageIds.length > 0 && pageIds.every(id => selected.has(id))

  const toggleOne = (id: number) => {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  const toggleAllPage = () => {
    setSelected(prev => {
      const next = new Set(prev)
      if (allPageSelected) {
        pageIds.forEach(id => next.delete(id))
      } else {
        pageIds.forEach(id => next.add(id))
      }
      return next
    })
  }

  const openAdd  = () => { setEditPhrase(undefined); setDialogOpen(true) }
  const openEdit = (p: Phrase) => { setEditPhrase(p); setDialogOpen(true) }
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1) }
  const toggleTypeFilter = (t: string) => {
    setTypeFilter(prev => {
      const next = new Set(prev)
      next.has(t) ? next.delete(t) : next.add(t)
      return next
    })
    setPage(1)
  }
  const clearTypeFilter = () => { setTypeFilter(new Set()); setPage(1) }

  const handleBulkDelete = () => {
    const ids = [...selected]
    if (!ids.length) return
    if (!confirm(`Xóa ${ids.length} câu đã chọn? (xóa mềm, có thể khôi phục)`)) return
    bulkDeleteMutation.mutate(ids)
  }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar />

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-gray-200 bg-white px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              {topicLoading ? (
                <Skeleton className="h-6 w-40 bg-gray-100" />
              ) : (
                <div className="flex items-center gap-2.5">
                  <span className="text-2xl">{topic?.icon}</span>
                  <div>
                    <h1 className="text-lg font-bold text-gray-900">{topic?.name}</h1>
                    {topic?.description && (
                      <p className="text-xs text-gray-400 mt-0.5">{topic.description}</p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-8">
          {/* ── Table card ── */}
          <div className="rounded-2xl border border-gray-200 bg-white overflow-hidden shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between gap-4 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800">Danh sách câu</h2>
                {!phrasesLoading && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                    {filtered.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Tìm câu, dịch nghĩa, loại..."
                    value={search}
                    onChange={(e) => handleSearchChange(e.target.value)}
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
                      <div className="absolute left-0 top-10 z-50 min-w-[170px] rounded-xl border border-gray-200 bg-white p-2 shadow-lg">
                        <div className="flex items-center justify-between px-2 pb-1.5 mb-1 border-b border-gray-100">
                          <span className="text-[11px] font-semibold text-gray-400 uppercase tracking-wide">Loại câu</span>
                          {typeFilter.size > 0 && (
                            <button onClick={clearTypeFilter} className="text-[11px] text-orange-500 hover:text-orange-700 font-medium">
                              Xóa tất cả
                            </button>
                          )}
                        </div>
                        {availableTypes.map(type => {
                          const count = phrases?.filter(p => p.type === type).length ?? 0
                          const checked = typeFilter.has(type)
                          return (
                            <label
                              key={type}
                              className="flex items-center gap-2.5 rounded-lg px-2 py-1.5 cursor-pointer hover:bg-gray-50"
                            >
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
                <Button
                  variant="outline"
                  onClick={() => setBulkAddOpen(true)}
                  className="h-8 shadow-sm text-gray-700 bg-white border-gray-200 hover:bg-gray-50 hover:text-gray-900 transition-colors"
                >
                  <Sparkles className="mr-1.5 h-3.5 w-3.5 text-orange-500" />
                  Nhiều câu
                </Button>
                <Button
                  onClick={openAdd}
                  className="bg-orange-600 text-white hover:bg-orange-700 h-8 shadow-sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Thêm câu mới
                </Button>
              </div>
            </div>


            {selected.size > 0 && (
              <div className="flex items-center justify-between px-6 py-2.5 bg-red-50 border-b border-red-100 animate-in slide-in-from-top-1 duration-150">
                <span className="text-sm font-medium text-red-700">
                  Đã chọn <span className="font-bold">{selected.size}</span> câu
                </span>
                <div className="flex items-center gap-2">
                  <button onClick={() => setSelected(new Set())} className="text-xs text-gray-500 hover:text-gray-700">
                    Bỏ chọn tất cả
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

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
                    {/* Checkbox */}
                    <th className="pl-5 w-10">
                      <input
                        type="checkbox"
                        checked={allPageSelected}
                        onChange={toggleAllPage}
                        className="h-3.5 w-3.5 rounded border-gray-300 accent-orange-500 cursor-pointer"
                      />
                    </th>
                    <th className="w-8" />
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-8">#</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Câu mẫu</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Dịch nghĩa</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-40">Phát âm (IPA)</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Cấu trúc</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-28">Loại</th>
                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {phrasesLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        {[...Array(9)].map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full bg-gray-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={9}>
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="mb-4 rounded-full bg-gray-100 p-5">
                            <BookOpen className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-400">
                            {search ? `Không tìm thấy kết quả cho "${search}"` : 'Chưa có câu nào — thêm câu đầu tiên!'}
                          </p>
                          {!search && (
                            <Button onClick={openAdd} size="sm" className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">
                              <Plus className="mr-1.5 h-3.5 w-3.5" /> Thêm câu
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((phrase, idx) => {
                      const isOpen      = expanded.has(phrase.id)
                      const isSelected  = selected.has(phrase.id)
                      const hasExamples = phrase.example1 || phrase.example2
                      return (
                        <React.Fragment key={phrase.id}>
                        <tr
                          className={cn(
                            'group border-b border-gray-100 transition-colors',
                            isSelected ? 'bg-orange-50/60' : 'hover:bg-gray-50',
                            isOpen && !isSelected ? 'bg-orange-50/30' : '',
                          )}
                        >
                          {/* Checkbox */}
                          <td className="pl-5 w-10" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => toggleOne(phrase.id)}
                              className="h-3.5 w-3.5 rounded border-gray-300 accent-orange-500 cursor-pointer"
                            />
                          </td>
                          {/* Expand */}
                          <td className="cursor-pointer w-8 pl-1" onClick={() => hasExamples && toggleExpand(phrase.id)}>
                            {hasExamples && (
                              <span className="text-gray-300 group-hover:text-gray-500 transition-colors">
                                {isOpen ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRightIcon className="h-3.5 w-3.5" />}
                              </span>
                            )}
                          </td>
                          {/* # */}
                          <td className="px-4 py-3.5 text-xs text-gray-300 w-8">
                            {(currentPage - 1) * PAGE_SIZE + idx + 1}
                          </td>
                          {/* Sentence */}
                          <td className="px-4 py-3.5">
                            <div className="flex items-center gap-1.5">
                              <button onClick={(e) => { e.stopPropagation(); speak(phrase.sample_sentence) }}
                                className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors">
                                <Volume2 className="h-3.5 w-3.5" />
                              </button>
                              <p className="font-semibold text-gray-900 truncate max-w-[200px]">{phrase.sample_sentence}</p>
                            </div>
                          </td>
                          {/* Translation */}
                          <td className="px-4 py-3.5">
                            <p className="text-gray-600 truncate max-w-[180px]">{phrase.translation ?? '—'}</p>
                          </td>
                          {/* IPA */}
                          <td className="px-4 py-3.5 w-40">
                            <span className="font-mono text-xs text-orange-500 block truncate">{phrase.pronunciation ?? '—'}</span>
                          </td>
                          {/* Structure — render with brackets */}
                          <td className="px-4 py-3.5 max-w-[200px]">
                            {phrase.structure
                              ? <StructureText text={phrase.structure} />
                              : <span className="text-gray-300 text-xs">—</span>
                            }
                          </td>
                          {/* Type */}
                          <td className="px-4 py-3.5 w-28">
                            <TypeBadge type={phrase.type} />
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button onClick={() => setViewPhrase(phrase)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 transition-colors" title="Xem chi tiết">
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => openEdit(phrase)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 transition-colors" title="Chỉnh sửa">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => { if (confirm('Xóa câu này?')) deleteMutation.mutate(phrase.id) }}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 transition-colors" title="Xóa">
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>

                        {/* Tree: Examples */}
                        {isOpen && (
                          <>
                            {[
                              { ex: phrase.example1, tr: phrase.example1_translation, ipa: phrase.example1_pronunciation, n: 1 },
                              { ex: phrase.example2, tr: phrase.example2_translation, ipa: phrase.example2_pronunciation, n: 2 }
                            ].filter(e => e.ex).map((e) => (
                              <tr key={`ex-${phrase.id}-${e.n}`} className="border-b border-gray-50 bg-orange-50/20">
                                {/* Col: checkbox placeholder */}
                                <td className="w-10 pl-5" />
                                {/* Col1: tree line */}
                                <td className="w-8 pl-2">
                                  <div className="flex items-center gap-1">
                                    <div className="w-3 h-px bg-gray-200" />
                                    <span className="text-[10px] font-semibold text-gray-300">VD{e.n}</span>
                                  </div>
                                </td>
                                <td className="w-8" />
                                {/* example sentence */}
                                <td className="px-4 py-2">
                                  <div className="flex items-center gap-1.5">
                                    <button onClick={(ev) => { ev.stopPropagation(); speak(e.ex!) }}
                                      className="shrink-0 text-gray-300 hover:text-blue-500 transition-colors">
                                      <Volume2 className="h-3 w-3" />
                                    </button>
                                    <p className="text-gray-600 text-xs italic">{e.ex}</p>
                                  </div>
                                </td>
                                {/* Dịch nghĩa */}
                                <td className="px-4 py-2">
                                  <p className="text-gray-400 text-xs">{e.tr}</p>
                                </td>
                                {/* IPA */}
                                <td className="px-4 py-2 w-40">
                                  <span className="font-mono text-[11px] text-orange-400 block truncate max-w-[150px]">{e.ipa}</span>
                                </td>
                                {/* Cấu trúc — empty */}
                                <td className="px-4 py-2" />
                                {/* Loại — empty */}
                                <td className="px-4 py-2 w-28" />
                                <td className="px-6 py-2" />
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
            </div>

            {/* Pagination */}
            {!phrasesLoading && totalPages > 1 && (
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <p className="text-xs text-gray-400">
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} câu
                </p>
                <div className="flex items-center gap-1">
                  <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setPage(i + 1)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                        currentPage === i + 1 ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}>
                      {i + 1}
                    </button>
                  ))}
                  <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
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

      {/* View Dialog */}
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
