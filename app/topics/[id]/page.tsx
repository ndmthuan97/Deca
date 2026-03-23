'use client'

import { useState, useMemo } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useParams } from 'next/navigation'
import { Sidebar } from '@/components/layout/Sidebar'
import { PhraseForm } from '@/components/phrases/PhraseForm'
import { TopicSelector } from '@/components/layout/TopicSelector'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { Input } from '@/components/ui/input'
import {
  Plus, BookOpen, Search, Pencil, Trash2, Volume2,
  ChevronLeft, ChevronRight, ChevronDown, ChevronRight as ChevronRightIcon
} from 'lucide-react'
import { toast } from 'sonner'
import { TopicSelector as _TS } from '@/components/layout/TopicSelector'
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

export default function TopicPage() {
  const params = useParams<{ id: string }>()
  const queryClient = useQueryClient()
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editPhrase, setEditPhrase] = useState<Phrase | undefined>()
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const [expanded, setExpanded] = useState<Set<number>>(new Set())

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

  const filtered = useMemo(() =>
    phrases?.filter((p) =>
      search
        ? p.sample_sentence.toLowerCase().includes(search.toLowerCase()) ||
          p.translation?.toLowerCase().includes(search.toLowerCase()) ||
          p.type?.toLowerCase().includes(search.toLowerCase())
        : true
    ) ?? [], [phrases, search])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  const openAdd = () => { setEditPhrase(undefined); setDialogOpen(true) }
  const openEdit = (p: Phrase) => { setEditPhrase(p); setDialogOpen(true) }
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1) }

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      <Sidebar onAddTopic={() => {}} />

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
            <div className="flex items-center gap-3">
              <TopicSelector
                currentTopicId={topic?.id ?? 0}
                currentTopicName={topic?.name ?? '...'}
                currentTopicIcon={topic?.icon}
              />
              <Button
                onClick={openAdd}
                className="bg-violet-600 text-white hover:bg-violet-700 shadow-sm"
              >
                <Plus className="mr-1.5 h-4 w-4" />
                Thêm câu mới
              </Button>
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
                  <span className="rounded-full bg-violet-50 px-2 py-0.5 text-xs font-medium text-violet-600">
                    {filtered.length}
                  </span>
                )}
              </div>
              <div className="relative w-64">
                <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                <Input
                  placeholder="Tìm câu, dịch nghĩa, loại..."
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  className="pl-9 h-8 border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:border-violet-400"
                />
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100 bg-gray-50/60">
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
                        {[...Array(8)].map((_, j) => (
                          <td key={j} className="px-4 py-3">
                            <Skeleton className="h-4 w-full bg-gray-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={8}>
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="mb-4 rounded-full bg-gray-100 p-5">
                            <BookOpen className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-400">
                            {search ? `Không tìm thấy kết quả cho "${search}"` : 'Chưa có câu nào — thêm câu đầu tiên!'}
                          </p>
                          {!search && (
                            <Button onClick={openAdd} size="sm" className="mt-4 bg-violet-600 hover:bg-violet-700 text-white">
                              <Plus className="mr-1.5 h-3.5 w-3.5" /> Thêm câu
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((phrase, idx) => {
                      const isOpen = expanded.has(phrase.id)
                      const hasExamples = phrase.example1 || phrase.example2
                      return (
                        <>
                        <tr
                          key={phrase.id}
                          onClick={() => hasExamples && toggleExpand(phrase.id)}
                          className={`group border-b border-gray-100 transition-colors hover:bg-gray-50 ${hasExamples ? 'cursor-pointer' : ''} ${isOpen ? 'bg-violet-50/30' : ''}`}
                        >
                          {/* Expand */}
                          <td className="pl-4 w-8">
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
                            <span className="font-mono text-xs text-violet-500 block truncate">{phrase.pronunciation ?? '—'}</span>
                          </td>
                          {/* Structure */}
                          <td className="px-4 py-3.5">
                            <p className="text-gray-500 truncate text-xs max-w-[180px]">{phrase.structure ?? '—'}</p>
                          </td>
                          {/* Type */}
                          <td className="px-4 py-3.5 w-28">
                            <TypeBadge type={phrase.type} />
                          </td>
                          {/* Actions */}
                          <td className="px-6 py-3.5" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
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
                              <tr key={`ex-${phrase.id}-${e.n}`} className="border-b border-gray-50 bg-violet-50/20">
                                {/* Col1: tree line */}
                                <td className="w-8 pl-6">
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
                                {/* Dịch nghĩa — correct column */}
                                <td className="px-4 py-2">
                                  <p className="text-gray-400 text-xs">{e.tr}</p>
                                </td>
                                {/* IPA */}
                                <td className="px-4 py-2 w-40">
                                  <span className="font-mono text-[11px] text-violet-400 block truncate max-w-[150px]">{e.ipa}</span>
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
                        </>
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
                        currentPage === i + 1 ? 'bg-violet-600 text-white' : 'text-gray-500 hover:bg-gray-100'
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

      {/* Dialog */}
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
    </div>
  )
}
