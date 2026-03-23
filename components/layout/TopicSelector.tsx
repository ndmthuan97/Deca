'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { ChevronDown, Search, Plus, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import type { TopicWithCount } from '@/db/schema'

async function fetchTopics(): Promise<TopicWithCount[]> {
  const res = await fetch('/api/topics')
  if (!res.ok) throw new Error('Failed')
  return res.json()
}

interface TopicSelectorProps {
  currentTopicId: number
  currentTopicName: string
  currentTopicIcon?: string | null
}

export function TopicSelector({ currentTopicId, currentTopicName, currentTopicIcon }: TopicSelectorProps) {
  const router = useRouter()
  const queryClient = useQueryClient()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const [creating, setCreating] = useState(false)
  const [newTopicName, setNewTopicName] = useState('')
  const ref = useRef<HTMLDivElement>(null)

  const { data: topics } = useQuery({ queryKey: ['topics'], queryFn: fetchTopics })

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const createMutation = useMutation({
    mutationFn: async (name: string) => {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
      const res = await fetch('/api/topics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, slug }),
      })
      if (!res.ok) throw new Error('Failed to create topic')
      return res.json()
    },
    onSuccess: (topic) => {
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success(`Đã tạo topic "${topic.name}"!`)
      setCreating(false)
      setNewTopicName('')
      router.push(`/topics/${topic.id}`)
      setOpen(false)
    },
    onError: () => toast.error('Tạo topic thất bại'),
  })

  const filtered = topics?.filter((t) =>
    t.name.toLowerCase().includes(search.toLowerCase())
  ) ?? []

  const handleSelect = (id: number) => {
    if (id === currentTopicId) { setOpen(false); return }
    router.push(`/topics/${id}`)
    setOpen(false)
    setSearch('')
  }

  const handleCreate = () => {
    if (!newTopicName.trim()) return
    createMutation.mutate(newTopicName.trim())
  }

  return (
    <div ref={ref} className="relative">
      {/* Trigger */}
      <button
        onClick={() => setOpen((v) => !v)}
        className="flex items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50 hover:border-gray-300 transition-all shadow-sm"
      >
        <span className="text-base leading-none">{currentTopicIcon ?? '📚'}</span>
        <span className="max-w-[160px] truncate font-medium">{currentTopicName}</span>
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown */}
      {open && (
        <div className="absolute left-0 top-full z-50 mt-1.5 w-72 overflow-hidden rounded-xl border border-gray-200 bg-white shadow-lg shadow-gray-200/60">
          {/* Search */}
          <div className="border-b border-gray-100 p-2">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
              <input
                autoFocus
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Tìm topic..."
                className="w-full rounded-lg border border-gray-100 bg-gray-50 py-1.5 pl-8 pr-3 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:border-violet-300 focus:bg-white"
              />
            </div>
          </div>

          {/* Topic list */}
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-4 text-center text-xs text-gray-400">Không tìm thấy</p>
            ) : (
              filtered.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleSelect(t.id)}
                  className={`flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gray-50 ${
                    t.id === currentTopicId ? 'bg-violet-50' : ''
                  }`}
                >
                  <span className="text-base">{t.icon ?? '📚'}</span>
                  <div className="flex-1 min-w-0">
                    <p className={`truncate text-sm ${t.id === currentTopicId ? 'font-medium text-violet-700' : 'text-gray-700'}`}>
                      {t.name}
                    </p>
                    <p className="text-xs text-gray-400">{t.phrase_count ?? 0} câu</p>
                  </div>
                  {t.id === currentTopicId && (
                    <Check className="h-3.5 w-3.5 shrink-0 text-violet-500" />
                  )}
                </button>
              ))
            )}
          </div>

          {/* Create new topic */}
          <div className="border-t border-gray-100 p-2">
            {creating ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={newTopicName}
                  onChange={(e) => setNewTopicName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') handleCreate(); if (e.key === 'Escape') setCreating(false) }}
                  placeholder="Tên topic mới..."
                  className="flex-1 rounded-lg border border-violet-300 bg-white px-2.5 py-1.5 text-sm text-gray-700 placeholder:text-gray-400 outline-none focus:ring-1 focus:ring-violet-300"
                />
                <button
                  onClick={handleCreate}
                  disabled={createMutation.isPending}
                  className="flex items-center gap-1 rounded-lg bg-violet-600 px-2.5 py-1.5 text-xs text-white hover:bg-violet-700 disabled:opacity-50"
                >
                  {createMutation.isPending ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Tạo'}
                </button>
              </div>
            ) : (
              <button
                onClick={() => setCreating(true)}
                className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-sm text-violet-600 hover:bg-violet-50 transition-colors"
              >
                <Plus className="h-3.5 w-3.5" />
                Tạo topic mới
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
