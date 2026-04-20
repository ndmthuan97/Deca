'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import {
  Plus, Search, Loader2, Pencil, Trash2, Eye, Check, X,
  BookOpen, ChevronLeft, ChevronRight, GraduationCap, Sparkles,
  Brain, BarChart2, ArrowRight, Mic, RotateCcw, Upload, Zap,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { apiFetch } from '@/lib/api-client'
import { cn } from '@/lib/utils'
import type { TopicWithCount } from '@/db/schema'
import { QuickCaptureModal } from '@/components/phrases/QuickCaptureModal'

/* ─── Onboarding Modal ───────────────────────────────────────── */
const ONBOARDING_KEY = 'dace:onboarding-done'

const STEPS = [
  {
    emoji: '📚',
    title: 'Tạo chủ đề học',
    desc: 'Tổ chức câu theo chủ đề — Business, Travel, Daily Life... AI tự gợi ý icon phù hợp.',
    tip: 'Mỗi topic là một bộ flashcard độc lập',
    color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600',
  },
  {
    emoji: '✨',
    title: 'Thêm câu bằng AI',
    desc: 'Nhập danh sách câu — AI tự điền phát âm IPA, dịch nghĩa, ví dụ sử dụng và phân loại ngữ pháp.',
    tip: 'Bulk add nhiều câu cùng lúc, AI xử lý hàng loạt',
    color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600',
  },
  {
    emoji: '🧠',
    title: 'Ôn tập thông minh',
    desc: 'Hệ thống SRS (SM-2) nhớ từng câu bạn học. Quiz, Chính tả, Learn Mode 4 giai đoạn — học sâu mỗi ngày.',
    tip: 'Chỉ 15 phút/ngày để ghi nhớ hàng trăm câu',
    color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600',
  },
]

function OnboardingModal({ onClose, onStart }: { onClose: () => void; onStart: () => void }) {
  const [step, setStep] = useState(0)
  const isLast = step === STEPS.length - 1
  const s = STEPS[step]

  function dismiss() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    onClose()
  }

  function handleStart() {
    localStorage.setItem(ONBOARDING_KEY, '1')
    onStart()
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center px-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={dismiss} />

      {/* Panel */}
      <div className="relative w-full max-w-md rounded-2xl bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: '0 24px 64px rgba(0,0,0,0.18)' }}>

        {/* Close */}
        <button onClick={dismiss}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-[#999] hover:text-[#171717] dark:hover:text-[#f5f5f5] hover:bg-[#f5f5f5] dark:hover:bg-white/8 transition-colors">
          <X className="h-4 w-4" />
        </button>

        {/* Step content */}
        <div className="px-8 pt-8 pb-6">
          {/* Header */}
          <div className="mb-2 flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-widest text-[#999]">Bắt đầu với DACE</span>
          </div>

          {/* Card */}
          <div className={cn('rounded-2xl p-6 mb-6 transition-all', s.color.split(' ').slice(0,2).join(' '))}>
            <div className="text-4xl mb-3">{s.emoji}</div>
            <h2 className="text-[18px] font-bold text-[#171717] dark:text-[#f5f5f5] mb-2">{s.title}</h2>
            <p className="text-[13px] text-[#555] dark:text-[#aaa] leading-relaxed">{s.desc}</p>
            <div className="mt-4 flex items-center gap-1.5">
              <span className="text-[11px] font-semibold text-[#888]">💡 {s.tip}</span>
            </div>
          </div>

          {/* Step dots */}
          <div className="flex items-center gap-1.5 mb-6">
            {STEPS.map((_, i) => (
              <button key={i} onClick={() => setStep(i)}
                className={cn('h-1.5 rounded-full transition-all', i === step ? 'w-6 bg-[#171717] dark:bg-[#f5f5f5]' : 'w-1.5 bg-[#ddd] dark:bg-[#444]')} />
            ))}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {step > 0 && (
              <button onClick={() => setStep(s => s - 1)}
                className="flex items-center gap-1 rounded-lg px-3 py-2 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors">
                <ChevronLeft className="h-3.5 w-3.5" /> Trước
              </button>
            )}
            <div className="flex-1" />
            {!isLast ? (
              <button onClick={() => setStep(s => s + 1)}
                className="flex items-center gap-2 rounded-lg bg-[#171717] dark:bg-[#f5f5f5] px-4 py-2.5 text-[13px] font-semibold text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
                Tiếp theo <ChevronRight className="h-3.5 w-3.5" />
              </button>
            ) : (
              <button onClick={handleStart}
                className="flex items-center gap-2 rounded-lg bg-[#171717] dark:bg-[#f5f5f5] px-5 py-2.5 text-[13px] font-semibold text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
                Tạo chủ đề đầu tiên <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const PAGE_SIZE = 10

async function fetchTopics(): Promise<TopicWithCount[]> {
  return apiFetch<TopicWithCount[]>('/api/topics')
}

export default function HomePage() {
  const router = useRouter()
  const queryClient = useQueryClient()

  const [search, setSearch] = useState('')
  const debouncedSearch = useDebounce(search, 400)
  const [mobileCreateOpen, setMobileCreateOpen] = useState(false)
  const [mobileNewName, setMobileNewName] = useState('')
  const [page, setPage] = useState(1)
  const [showOnboarding, setShowOnboarding] = useState(false)

  // ── Inline create state ──
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [previewIcon, setPreviewIcon] = useState('📚')
  const [iconLoading, setIconLoading] = useState(false)

  // ── Import state ──
  const [importing, setImporting] = useState(false)

  // ── Quick Capture state ──
  const [showQuickCapture, setShowQuickCapture] = useState(false)

  // ── Update dialog state ──
  const [updateDialogTopic, setUpdateDialogTopic] = useState<{ id: number; name: string; description: string } | null>(null)
  const [updateName, setUpdateName] = useState('')
  const [updateDesc, setUpdateDesc] = useState('')

  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: fetchTopics,
  })

  // ── Filtered + paginated ──
  const filtered = useMemo(() =>
    topics?.filter((t) =>
      debouncedSearch
        ? t.name.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
          t.description?.toLowerCase().includes(debouncedSearch.toLowerCase())
        : true
    ) ?? [], [topics, debouncedSearch])

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const currentPage = Math.min(page, totalPages)
  const paginated = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE)

  // Reset page when search changes
  const handleSearchChange = (v: string) => { setSearch(v); setPage(1) }

  // Show onboarding on first visit if no topics
  useEffect(() => {
    if (!isLoading && topics && topics.length === 0) {
      const done = localStorage.getItem(ONBOARDING_KEY)
      if (!done) setShowOnboarding(true)
    }
  }, [isLoading, topics])

  const debouncedNewName = useDebounce(newName, 600)

  // Fetch AI icon preview when name changes
  useEffect(() => {
    if (!debouncedNewName || debouncedNewName.length < 2) {
      setPreviewIcon('📚')
      return
    }
    let cancelled = false
    setIconLoading(true)
    apiFetch<{ icon: string }>(`/api/topics/suggest-icon?name=${encodeURIComponent(debouncedNewName)}`)
      .then((data) => {
        if (!cancelled) setPreviewIcon(data.icon ?? '📚')
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setIconLoading(false) })
    return () => { cancelled = true }
  }, [debouncedNewName])

  // ── Mutations ──
  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      return apiFetch<{ name: string }>('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })
    },
    onSuccess: (topic) => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success(`Đã tạo chủ đề "${topic.name}"`)
      setCreating(false)
      setNewName('')
    },
    onError: () => toast.error('Tạo chủ đề thất bại'),
  })

  const handleImportFile = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json,application/json'
    input.onchange = async () => {
      const file = input.files?.[0]
      if (!file) return
      setImporting(true)
      try {
        const text = await file.text()
        const json = JSON.parse(text)
        const res = await apiFetch<{ topic: { name: string }; phraseCount: number }>('/api/topics/import', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(json),
        })
        queryClient.invalidateQueries({ queryKey: ['topics'] })
        toast.success(`Đã import "${res.topic.name}" — ${res.phraseCount} câu`)
      } catch (e) {
        toast.error('Import thất bại. Kiểm tra lại file JSON.')
      } finally {
        setImporting(false)
      }
    }
    input.click()
  }

  const updateMutation = useMutation({
    mutationFn: async ({ id, name, description }: { id: number; name?: string; description?: string }) => {
      const payload: Record<string, string> = {}
      if (name !== undefined) {
        payload.slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        payload.name = name
      }
      if (description !== undefined) payload.description = description
      return apiFetch<{ name: string }>(`/api/topics/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
    },
    onSuccess: (topic) => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success(`Đã cập nhật "${topic.name}"`)
      setUpdateDialogTopic(null)
    },
    onError: () => toast.error('Cập nhật thất bại'),
  })

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await apiFetch(`/api/topics/${id}`, { method: 'DELETE' })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success('Đã xóa chủ đề')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  const handleCreate = () => {
    const name = newName.trim()
    if (!name) return
    createMutation.mutate(name)
  }

  const handleOpenUpdate = (topic: { id: number; name: string; description?: string | null }) => {
    setUpdateDialogTopic({ id: topic.id, name: topic.name, description: topic.description ?? '' })
    setUpdateName(topic.name)
    setUpdateDesc(topic.description ?? '')
  }

  const handleUpdate = () => {
    if (!updateDialogTopic || !updateName.trim()) return
    updateMutation.mutate({ id: updateDialogTopic.id, name: updateName.trim(), description: updateDesc.trim() })
  }

  const handleDelete = (id: number) => {
    if (confirm('Xóa chủ đề này? Tất cả câu bên trong sẽ bị xóa.')) {
      deleteMutation.mutate(id)
    }
  }

  const handleMobileCreate = () => {
    const name = mobileNewName.trim()
    if (!name) return
    createMutation.mutate(name, {
      onSuccess: () => {
        setMobileCreateOpen(false)
        setMobileNewName('')
      },
    })
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0a0a0a]">
      <Sidebar />

      {/* Onboarding modal */}
      {showOnboarding && (
        <OnboardingModal
          onClose={() => setShowOnboarding(false)}
          onStart={() => { setShowOnboarding(false); setCreating(true) }}
        />
      )}

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* ── Header — Vercel nav bottom shadow-border ── */}
        <div
          className="shrink-0 bg-white dark:bg-[#111111] pl-[60px] pr-4 py-3 md:pl-6 md:pr-8 md:py-5"
          style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
        >
          <h1 className="text-page-title text-base md:text-[20px]">Quản lý chủ đề</h1>
          <p className="mt-0.5 text-[13px] text-[#666666] dark:text-[#888888] hidden sm:block">
            Tạo và quản lý các chủ đề học tiếng Anh
          </p>
        </div>

        {/* ── Content ── */}
        <div className="flex-1 overflow-y-auto p-4 md:p-8">

          {/* Mobile: search + add in gray area */}
          <div className="flex md:hidden items-center gap-2 mb-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <Input
                placeholder="Tìm chủ đề..."
                value={search}
                onChange={e => handleSearchChange(e.target.value)}
                className="pl-8 h-9 w-full text-sm"
              />
            </div>
            <button
              onClick={() => setMobileCreateOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 shrink-0 transition-opacity"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          {/* Vercel card: shadow stack, no CSS border */}
          <div
            className="rounded-[8px] bg-white dark:bg-[#111111] overflow-hidden"
            style={{ boxShadow: 'var(--shadow-card)' }}
          >
            {/* Toolbar – desktop only — Vercel shadow-border bottom */}
            <div
              className="hidden md:flex items-center justify-between gap-3 px-6 py-4"
              style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
            >
              <div className="flex items-center gap-2">
                <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] tracking-tight">Danh sách chủ đề</h2>
                {!isLoading && (
                  <span className="badge-vercel">{filtered.length}</span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#999999]" />
                  <Input
                    placeholder="Tìm chủ đề..."
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="pl-9 h-8"
                  />
                </div>
                <Button onClick={() => setCreating(true)} size="sm">
                  <Plus className="mr-1.5 h-4 w-4" />
                  Thêm chủ đề
                </Button>
                <Button
                  onClick={() => setShowQuickCapture(true)}
                  size="sm"
                  variant="outline"
                  title="Quick Capture — dán text, AI trích câu hay"
                >
                  <Zap className="mr-1.5 h-4 w-4 text-amber-500" />
                  Quick Capture
                </Button>
                <Button
                  onClick={handleImportFile}
                  disabled={importing}
                  size="sm"
                  variant="outline"
                  title="Import chủ đề từ file JSON"
                >
                  {importing
                    ? <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                    : <Upload className="mr-1.5 h-4 w-4" />}
                  Import
                </Button>
              </div>
            </div>

            {/* ── Inline Create Row ── */}
            {creating && (
              <div
                className="flex items-center gap-3 bg-[#fafafa] dark:bg-[#1a1a1a] px-6 py-3"
                style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
              >
                <span className={`text-base min-w-[1.5rem] text-center transition-all ${iconLoading ? 'animate-pulse opacity-50' : ''}`}>
                  {previewIcon}
                </span>
                <Input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') { setCreating(false); setNewName('') }
                  }}
                  placeholder="Nhập tên chủ đề mới..."
                  className="flex-1 h-8"
                />
                <Button size="sm" onClick={handleCreate} disabled={createMutation.isPending}>
                  {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3" /> Tạo</>}
                </Button>
                <button
                  onClick={() => { setCreating(false); setNewName('') }}
                  className="rounded-[6px] p-1.5 text-[#999999] hover:bg-[#f5f5f5] hover:text-[#171717] dark:hover:bg-white/8 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="md:hidden">
              <div className="space-y-2 p-3">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-[8px] bg-white dark:bg-[#111] px-4 py-3" style={{ boxShadow: 'var(--shadow-card)' }}>
                      <div className="h-10 w-10 animate-pulse rounded-[6px] bg-[#f0f0f0] dark:bg-[#222] shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3.5 w-2/3 animate-pulse rounded bg-[#f0f0f0] dark:bg-[#222]" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-[#f0f0f0] dark:bg-[#222]" />
                      </div>
                    </div>
                  ))
                ) : paginated.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-12 px-4 text-center">
                    {search ? (
                      <>
                        <div className="mb-3 rounded-full bg-gray-100 dark:bg-gray-800 p-4">
                          <Search className="h-6 w-6 text-gray-300 dark:text-gray-600" />
                        </div>
                        <p className="text-sm text-gray-400">Không tìm thấy &ldquo;{search}&rdquo;</p>
                      </>
                    ) : (
                      <>
                        <div className="mb-4 text-5xl">📚</div>
                        <h3 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] mb-1">Chưa có chủ đề nào</h3>
                        <p className="text-[13px] text-[#999] mb-5">Tạo chủ đề đầu tiên để bắt đầu hành trình học tiếng Anh</p>
                        <div className="flex gap-2">
                          <button onClick={() => setMobileCreateOpen(true)}
                            className="flex items-center gap-1.5 rounded-lg bg-[#171717] dark:bg-[#f5f5f5] px-4 py-2 text-[13px] font-semibold text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
                            <Plus className="h-3.5 w-3.5" /> Tạo chủ đề
                          </button>
                          <button onClick={() => setShowOnboarding(true)}
                            className="flex items-center gap-1.5 rounded-lg border border-[#e0e0e0] dark:border-[#333] px-4 py-2 text-[13px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors">
                            Xem hướng dẫn
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  paginated.map(topic => (
                    <div
                      key={topic.id}
                      onClick={() => router.push(`/topics/${topic.id}`)}
                      className="group flex items-center gap-3 rounded-[8px] bg-white dark:bg-[#111] px-4 py-3 cursor-pointer transition-opacity hover:opacity-90"
                      style={{ boxShadow: 'var(--shadow-card)' }}
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5] text-lg">
                        {topic.icon ?? '📚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">{topic.name}</p>
                        <div className="flex items-center gap-2 mt-0.5">
                          <p className="text-[11px] text-[#999] tabular-nums">{topic.phrase_count ?? 0} câu</p>
                          {(topic.phrase_count ?? 0) > 0 && (
                            <span className={cn(
                              'text-[10px] font-medium tabular-nums',
                              (topic.learned_count ?? 0) >= (topic.phrase_count ?? 1)
                                ? 'text-emerald-500'
                                : 'text-[#bbb]'
                            )}>
                              {(topic.learned_count ?? 0) >= (topic.phrase_count ?? 1) ? '🎖️ ' : ''}
                              {topic.learned_count ?? 0}/{topic.phrase_count ?? 0} thuộc
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleOpenUpdate(topic)}
                          className="rounded-[6px] p-1.5 text-[#bbb] hover:bg-[#f5f5f5] dark:hover:bg-[#222] hover:text-[#666] transition-colors">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(topic.id)}
                          className="rounded-[6px] p-1.5 text-[#bbb] hover:bg-red-50 dark:hover:bg-red-900/20 hover:text-red-500 transition-colors">
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* ── Desktop: Table ── */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }} className="bg-[#fafafa] dark:bg-[#1a1a1a]">
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666666] dark:text-[#888888] w-12">Icon</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666666] dark:text-[#888888]">Tên chủ đề</th>
                    <th className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-widest text-[#666666] dark:text-[#888888]">Mô tả</th>
                    <th className="px-4 py-3 text-center text-[11px] font-medium uppercase tracking-widest text-[#666666] dark:text-[#888888] w-24">Số câu</th>
                    <th className="px-6 py-3 text-right text-[11px] font-medium uppercase tracking-widest text-[#666666] dark:text-[#888888] w-28">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {isLoading ? (
                    [...Array(5)].map((_, i) => (
                      <tr key={i} className="border-b border-gray-100">
                        {[...Array(5)].map((_, j) => (
                          <td key={j} className="px-4 py-3.5">
                            <div className="h-4 w-full animate-pulse rounded bg-gray-100" />
                          </td>
                        ))}
                      </tr>
                    ))
                  ) : paginated.length === 0 ? (
                    <tr>
                      <td colSpan={5}>
                        {search ? (
                          <div className="flex flex-col items-center justify-center py-20 text-center">
                            <div className="mb-4 rounded-full bg-gray-100 p-5">
                              <Search className="h-8 w-8 text-gray-300" />
                            </div>
                            <p className="text-sm font-medium text-gray-400">Không tìm thấy &ldquo;{search}&rdquo;</p>
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center py-16 px-8 text-center">
                            <div className="text-6xl mb-5">📚</div>
                            <h3 className="text-[16px] font-bold text-[#171717] dark:text-[#f5f5f5] mb-2">Chào mừng đến với DACE!</h3>
                            <p className="text-[13px] text-[#999] max-w-md mb-8">
                              Tạo chủ đề đầu tiên để bắt đầu. AI sẽ tự điền phát âm, nghĩa và ví dụ cho từng câu.
                            </p>
                            {/* Feature preview cards */}
                            <div className="grid grid-cols-3 gap-3 mb-8 w-full max-w-lg">
                              {[
                                { icon: <Sparkles className="h-5 w-5" />, label: 'AI fill nội dung', color: 'text-amber-500 bg-amber-50 dark:bg-amber-900/20' },
                                { icon: <Brain className="h-5 w-5" />, label: 'SRS thông minh', color: 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' },
                                { icon: <Mic className="h-5 w-5" />, label: 'Quiz & Chính tả', color: 'text-rose-500 bg-rose-50 dark:bg-rose-900/20' },
                              ].map(f => (
                                <div key={f.label} className="rounded-xl border border-[#f0f0f0] dark:border-[#222] p-4 text-center">
                                  <div className={cn('inline-flex rounded-lg p-2 mb-2', f.color)}>{f.icon}</div>
                                  <p className="text-[11px] font-medium text-[#555] dark:text-[#999]">{f.label}</p>
                                </div>
                              ))}
                            </div>
                            <div className="flex gap-3">
                              <Button onClick={() => setCreating(true)}
                                className="bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90">
                                <Plus className="mr-1.5 h-3.5 w-3.5" /> Tạo chủ đề đầu tiên
                              </Button>
                              <Button variant="outline" onClick={() => setShowOnboarding(true)}>
                                Xem hướng dẫn
                              </Button>
                            </div>
                          </div>
                        )}
                      </td>
                    </tr>
                  ) : (
                    paginated.map((topic) => (
                        <tr
                          key={topic.id}
                          className="group cursor-pointer transition-colors hover:bg-[#fafafa] dark:hover:bg-white/3"
                          style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 1px 0px 0px' }}
                          onClick={() => router.push(`/topics/${topic.id}`)}
                        >
                          <td className="px-4 py-3.5 text-xl">
                            <span>{topic.icon ?? '📚'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            {/* Vercel: hover → link-blue */}
                            <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] group-hover:text-[#0072f5] transition-colors">{topic.name}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-[13px] text-[#666666] dark:text-[#888888] truncate max-w-[300px]">
                              {topic.description ?? <span className="italic text-[#aaaaaa] dark:text-[#555555]">Chưa có mô tả</span>}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <div className="flex flex-col items-center gap-0.5">
                              <span className="badge-vercel">{topic.phrase_count ?? 0}</span>
                              {topic.phrase_count > 0 && (
                                <span className={cn(
                                  'text-[10px] tabular-nums font-medium',
                                  topic.learned_count >= topic.phrase_count
                                    ? 'text-emerald-500'
                                    : 'text-[#ccc] dark:text-[#555]'
                                )}>
                                  {topic.learned_count >= topic.phrase_count
                                    ? '🎖️ Mastered'
                                    : `${topic.learned_count}/${topic.phrase_count} thuộc`}
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-3.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => router.push(`/topics/${topic.id}`)}
                                className="rounded-[6px] p-1.5 text-[#999999] hover:bg-[#f0f7ff] hover:text-[#0072f5] dark:hover:bg-blue-900/20 dark:hover:text-blue-400 transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenUpdate(topic)}
                                className="rounded-[6px] p-1.5 text-[#999999] hover:bg-[#fafafa] hover:text-[#171717] dark:hover:bg-white/8 dark:hover:text-[#f5f5f5] transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(topic.id)}
                                disabled={deleteMutation.isPending}
                                className="rounded-[6px] p-1.5 text-[#999999] hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-900/20 dark:hover:text-red-400 transition-colors disabled:opacity-40"
                                title="Xóa"
                              >
                                {deleteMutation.isPending
                                  ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                                  : <Trash2 className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          </td>
                        </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {/* ── Pagination ── */}
            {!isLoading && totalPages > 1 && (
              <div
                className="flex items-center justify-between px-6 py-3"
                style={{ boxShadow: 'rgba(0,0,0,0.06) 0px -1px 0px 0px' }}
              >
                <p className="text-[12px] text-[#666666] dark:text-[#888888]">
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} chủ đề
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#666666] hover:bg-[#fafafa] hover:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`flex h-7 w-7 items-center justify-center rounded-[6px] text-[12px] font-medium transition-colors ${
                        currentPage === i + 1
                          ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                          : 'text-[#666666] hover:bg-[#fafafa] dark:hover:bg-white/5'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-[6px] text-[#666666] hover:bg-[#fafafa] hover:text-[#171717] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* ── Dialog cập nhật chủ đề ── */}
      <Dialog open={!!updateDialogTopic} onOpenChange={open => { if (!open) setUpdateDialogTopic(null) }}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-[#111] border-[#eaeaea] dark:border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-[#171717] dark:text-[#f5f5f5] flex items-center gap-2">
              <Pencil className="h-4 w-4 text-[#666]" />
              Chỉnh sửa chủ đề
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Tên chủ đề</label>
              <Input
                autoFocus
                value={updateName}
                onChange={e => setUpdateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleUpdate() }}
                className="border-[#eaeaea] dark:border-[#333] bg-white dark:bg-[#111] text-[#171717] dark:text-[#f5f5f5] focus:border-black dark:focus:border-white"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium uppercase tracking-widest text-[#999] mb-1.5 block">Mô tả (tuỳ chọn)</label>
              <Input
                value={updateDesc}
                onChange={e => setUpdateDesc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleUpdate() }}
                placeholder="Mô tả ngắn về chủ đề..."
                className="border-[#eaeaea] dark:border-[#333] bg-white dark:bg-[#111] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#999] focus:border-black dark:focus:border-white"
              />
            </div>
              <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setUpdateDialogTopic(null)} className="border-[#eaeaea] dark:border-[#333] text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#222]">
                Hủy
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!updateName.trim() || updateMutation.isPending}
                className="bg-black dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/80"
              >
                {updateMutation.isPending
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang lưu...</>
                  : <><Check className="mr-1.5 h-3.5 w-3.5" /> Lưu thay đổi</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Dialog tạo chủ đề (mobile) ── */}
      <Dialog open={mobileCreateOpen} onOpenChange={open => { setMobileCreateOpen(open); if (!open) setMobileNewName('') }}>
        <DialogContent className="sm:max-w-sm bg-white dark:bg-[#111] border-[#eaeaea] dark:border-[#333]">
          <DialogHeader>
            <DialogTitle className="text-[#171717] dark:text-[#f5f5f5] flex items-center gap-2">
              <Plus className="h-4 w-4 text-[#666]" />
              Tạo chủ đề mới
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-medium text-[#666] dark:text-[#888] mb-1.5 block">
                Tên chủ đề
              </label>
              <Input
                autoFocus
                value={mobileNewName}
                onChange={e => setMobileNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleMobileCreate() }}
                placeholder="VD: Greetings, Meeting..."
                className="border-[#eaeaea] dark:border-[#333] bg-white dark:bg-[#111] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#999] focus:border-black dark:focus:border-white"
              />
            </div>
              <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => { setMobileCreateOpen(false); setMobileNewName('') }}
                className="border-[#eaeaea] dark:border-[#333] text-[#666] dark:text-[#888] hover:bg-[#fafafa] dark:hover:bg-[#222]"
              >
                Hủy
              </Button>
              <Button
                onClick={handleMobileCreate}
                disabled={!mobileNewName.trim() || createMutation.isPending}
                className="bg-black dark:bg-white text-white dark:text-black hover:bg-black/80 dark:hover:bg-white/80"
              >
                {createMutation.isPending
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang tạo...</>
                  : <><Plus className="mr-1.5 h-3.5 w-3.5" /> Tạo chủ đề</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* ── Quick Capture Modal ── */}
      {showQuickCapture && topics && topics.length > 0 && (
        <QuickCaptureModal
          topics={topics}
          onClose={() => setShowQuickCapture(false)}
          onAdded={(tid, count) => {
            queryClient.invalidateQueries({ queryKey: ['topics'] })
            setShowQuickCapture(false)
          }}
        />
      )}
    </div>
  )
}
