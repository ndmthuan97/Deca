'use client'

import { useState, useMemo, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Sidebar } from '@/components/layout/Sidebar'
import {
  Plus, Search, Loader2, Pencil, Trash2, Eye, Check, X,
  BookOpen, ChevronLeft, ChevronRight,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { useDebounce } from '@/lib/hooks/useDebounce'
import { apiFetch } from '@/lib/api-client'
import type { TopicWithCount } from '@/db/schema'

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

  // ── Inline create state ──
  const [creating, setCreating] = useState(false)
  const [newName, setNewName] = useState('')
  const [previewIcon, setPreviewIcon] = useState('📚')
  const [iconLoading, setIconLoading] = useState(false)

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
    <div className="flex h-screen overflow-hidden bg-gray-50 dark:bg-gray-950">
      <Sidebar />

      <main className="flex flex-col flex-1 overflow-hidden">
        {/* ── Header ── */}
        <div className="shrink-0 border-b border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 pl-16 pr-4 py-3 md:px-8 md:py-5">
          <h1 className="text-lg md:text-xl font-bold text-gray-900">Quản lý chủ đề</h1>
          <p className="mt-0.5 text-xs md:text-sm text-gray-500 hidden sm:block">
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
                className="pl-8 h-9 w-full border-gray-200 bg-white text-sm placeholder:text-gray-400 focus:border-orange-400 shadow-sm"
              />
            </div>
            <button
              onClick={() => setMobileCreateOpen(true)}
              className="flex h-9 w-9 items-center justify-center rounded-lg bg-orange-600 text-white hover:bg-orange-700 shrink-0 shadow-sm"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>

          <div className="rounded-2xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 overflow-hidden shadow-sm">
            {/* Toolbar – desktop only */}
            <div className="hidden md:flex items-center justify-between gap-3 px-6 py-4 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-gray-800">Danh sách chủ đề</h2>
                {!isLoading && (
                  <span className="rounded-full bg-orange-50 px-2 py-0.5 text-xs font-medium text-orange-600">
                    {filtered.length}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <div className="relative w-72">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
                  <Input
                    placeholder="Tìm chủ đề..."
                    value={search}
                    onChange={e => handleSearchChange(e.target.value)}
                    className="pl-9 h-8 border-gray-200 bg-white text-sm text-gray-700 placeholder:text-gray-400 focus:border-orange-400"
                  />
                </div>
                <Button
                  onClick={() => setCreating(true)}
                  className="bg-orange-600 text-white hover:bg-orange-700 h-8 shadow-sm"
                >
                  <Plus className="mr-1.5 h-4 w-4" />
                  Thêm chủ đề
                </Button>
              </div>
            </div>

            {/* ── Inline Create Row ── */}
            {creating && (
              <div className="flex items-center gap-3 border-b border-orange-100 bg-orange-50/50 px-6 py-3">
                <span className={`text-base min-w-[1.5rem] text-center transition-all ${iconLoading ? 'animate-pulse opacity-50' : ''}`}>
                  {previewIcon}
                </span>
                <input
                  autoFocus
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleCreate()
                    if (e.key === 'Escape') { setCreating(false); setNewName('') }
                  }}
                  placeholder="Nhập tên chủ đề mới..."
                  className="flex-1 rounded-lg border border-orange-300 bg-white px-3 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-orange-400"
                />
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-1 rounded-lg bg-orange-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-orange-700 disabled:opacity-50 transition-colors"
                >
                  {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : <><Check className="h-3 w-3" /> Tạo</>}
                </button>
                <button
                  onClick={() => { setCreating(false); setNewName('') }}
                  className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600 transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            )}

            <div className="md:hidden">
              <div className="space-y-2 p-3">
                {isLoading ? (
                  [...Array(4)].map((_, i) => (
                    <div key={i} className="flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3">
                      <div className="h-11 w-11 animate-pulse rounded-xl bg-gray-100 dark:bg-gray-800 shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-4 w-2/3 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                        <div className="h-3 w-1/2 animate-pulse rounded bg-gray-100 dark:bg-gray-800" />
                      </div>
                    </div>
                  ))
                ) : paginated.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-16 text-center">
                    <div className="mb-3 rounded-full bg-gray-100 dark:bg-gray-800 p-4">
                      <BookOpen className="h-7 w-7 text-gray-300 dark:text-gray-600" />
                    </div>
                    <p className="text-sm text-gray-400">{search ? `Không tìm thấy "${search}"` : 'Chưa có chủ đề nào'}</p>
                  </div>
                ) : (
                  paginated.map(topic => (
                    <div
                      key={topic.id}
                      onClick={() => router.push(`/topics/${topic.id}`)}
                      className="group flex items-center gap-3 rounded-xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 px-4 py-3 hover:border-orange-200 dark:hover:border-orange-900 hover:shadow-sm active:bg-orange-50 dark:active:bg-orange-950 cursor-pointer transition-all"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-gray-800 to-gray-900 text-xl shadow-sm">
                        {topic.icon ?? '📚'}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-gray-900 dark:text-gray-100 truncate">{topic.name}</p>
                        <p className="text-xs text-gray-400 dark:text-gray-500">{topic.phrase_count ?? 0} câu</p>
                      </div>
                      <div className="flex items-center gap-1 shrink-0" onClick={e => e.stopPropagation()}>
                        <button onClick={() => handleOpenUpdate(topic)}
                          className="rounded-lg p-1.5 text-gray-300 dark:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 hover:text-gray-600 dark:hover:text-gray-300">
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button onClick={() => handleDelete(topic.id)}
                          className="rounded-lg p-1.5 text-gray-300 dark:text-gray-600 hover:bg-red-50 dark:hover:bg-red-950 hover:text-red-400">
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
                  <tr className="border-b border-gray-100 dark:border-gray-800 bg-gray-50/60 dark:bg-gray-900">
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-12">Icon</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Tên chủ đề</th>
                    <th className="px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-gray-400">Mô tả</th>
                    <th className="px-4 py-3 text-center text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-24">Số câu</th>
                    <th className="px-6 py-3 text-right text-[11px] font-semibold uppercase tracking-wider text-gray-400 w-28">Thao tác</th>
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
                        <div className="flex flex-col items-center justify-center py-20 text-center">
                          <div className="mb-4 rounded-full bg-gray-100 p-5">
                            <BookOpen className="h-8 w-8 text-gray-300" />
                          </div>
                          <p className="text-sm font-medium text-gray-400">
                            {search ? `Không tìm thấy "${search}"` : 'Chưa có chủ đề nào'}
                          </p>
                          {!search && (
                            <Button onClick={() => setCreating(true)} size="sm" className="mt-4 bg-orange-600 hover:bg-orange-700 text-white">
                              <Plus className="mr-1.5 h-3.5 w-3.5" /> Thêm chủ đề đầu tiên
                            </Button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ) : (
                    paginated.map((topic) => (
                        <tr
                          key={topic.id}
                          className="group border-b border-gray-100 dark:border-gray-800 transition-colors hover:bg-gray-50 dark:hover:bg-gray-900/50 cursor-pointer"
                          onClick={() => router.push(`/topics/${topic.id}`)}
                        >
                          <td className="px-4 py-3.5 text-xl">
                            <span>{topic.icon ?? '📚'}</span>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="font-semibold text-gray-900 dark:text-gray-100 group-hover:text-orange-600 transition-colors">{topic.name}</p>
                          </td>
                          <td className="px-4 py-3.5">
                            <p className="text-gray-500 dark:text-gray-400 text-sm truncate max-w-[300px]">
                              {topic.description ?? <span className="italic text-gray-300 dark:text-gray-600">Chưa có mô tả</span>}
                            </p>
                          </td>
                          <td className="px-4 py-3.5 text-center">
                            <span className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-800 px-2 py-0.5 text-xs font-medium text-gray-600 dark:text-gray-400">
                              {topic.phrase_count ?? 0}
                            </span>
                          </td>
                          <td className="px-6 py-3.5" onClick={e => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => router.push(`/topics/${topic.id}`)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
                                title="Xem chi tiết"
                              >
                                <Eye className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleOpenUpdate(topic)}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
                                title="Chỉnh sửa"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDelete(topic.id)}
                                disabled={deleteMutation.isPending}
                                className="rounded-lg p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500 dark:hover:bg-red-950 dark:hover:text-red-400 transition-colors disabled:opacity-40"
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
              <div className="flex items-center justify-between border-t border-gray-100 px-6 py-3">
                <p className="text-xs text-gray-400">
                  Hiển thị {(currentPage - 1) * PAGE_SIZE + 1}–{Math.min(currentPage * PAGE_SIZE, filtered.length)} / {filtered.length} chủ đề
                </p>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button
                      key={i}
                      onClick={() => setPage(i + 1)}
                      className={`flex h-7 w-7 items-center justify-center rounded-lg text-xs font-medium transition-colors ${
                        currentPage === i + 1 ? 'bg-orange-600 text-white' : 'text-gray-500 hover:bg-gray-100'
                      }`}
                    >
                      {i + 1}
                    </button>
                  ))}
                  <button
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="flex h-7 w-7 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
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
        <DialogContent className="sm:max-w-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Pencil className="h-4 w-4 text-orange-500" />
              Chỉnh sửa chủ đề
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Tên chủ đề</label>
              <Input
                autoFocus
                value={updateName}
                onChange={e => setUpdateName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleUpdate() }}
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:border-orange-400"
              />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">Mô tả (tuỳ chọn)</label>
              <Input
                value={updateDesc}
                onChange={e => setUpdateDesc(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleUpdate() }}
                placeholder="Mô tả ngắn về chủ đề..."
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-orange-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button variant="outline" onClick={() => setUpdateDialogTopic(null)}
                className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300">
                Hủy
              </Button>
              <Button
                onClick={handleUpdate}
                disabled={!updateName.trim() || updateMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white"
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
        <DialogContent className="sm:max-w-sm bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-800">
          <DialogHeader>
            <DialogTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Plus className="h-4 w-4 text-orange-500" />
              Tạo chủ đề mới
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 pt-1">
            <div>
              <label className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-1.5 block">
                Tên chủ đề
              </label>
              <Input
                autoFocus
                value={mobileNewName}
                onChange={e => setMobileNewName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleMobileCreate() }}
                placeholder="VD: Greetings, Meeting..."
                className="border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder:text-gray-400 focus:border-orange-400"
              />
            </div>
            <div className="flex gap-2 justify-end">
              <Button
                variant="outline"
                onClick={() => { setMobileCreateOpen(false); setMobileNewName('') }}
                className="border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300"
              >
                Hủy
              </Button>
              <Button
                onClick={handleMobileCreate}
                disabled={!mobileNewName.trim() || createMutation.isPending}
                className="bg-orange-600 hover:bg-orange-700 text-white"
              >
                {createMutation.isPending
                  ? <><Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" /> Đang tạo...</>
                  : <><Plus className="mr-1.5 h-3.5 w-3.5" /> Tạo chủ đề</>}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
