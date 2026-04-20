'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Brain, Zap, BookOpen, X, ChevronRight, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'

interface Topic {
  id: number
  name: string
  icon: string | null
}

interface ReviewSessionConfigProps {
  open: boolean
  onClose: () => void
}

const LIMIT_OPTIONS = [10, 20, 50, 100, 999] as const
const LIMIT_LABELS: Record<number, string> = {
  10:  '10 câu',
  20:  '20 câu',
  50:  '50 câu',
  100: '100 câu',
  999: 'Tất cả',
}

export function ReviewSessionConfig({ open, onClose }: ReviewSessionConfigProps) {
  const router = useRouter()
  const [topics,    setTopics]  = useState<Topic[]>([])
  const [topicId,   setTopicId] = useState<number | null>(null)   // null = all topics
  const [limit,     setLimit]   = useState<number>(20)
  const [dueCount,  setDueCount] = useState<number | null>(null)
  const [checking,  setChecking] = useState(false)

  // Load topics once
  useEffect(() => {
    if (!open) return
    apiFetch<Topic[]>('/api/topics')
      .then(data => setTopics(Array.isArray(data) ? data : (data as { data: Topic[] }).data ?? []))
      .catch(() => {})
  }, [open])

  // Check due count when config changes
  useEffect(() => {
    if (!open) return
    setChecking(true)
    const params = new URLSearchParams({ limit: String(limit) })
    if (topicId) params.set('topic_id', String(topicId))
    apiFetch<{ count: number }>(`/api/review/due?${params}`)
      .then(d => setDueCount(d.count))
      .catch(() => setDueCount(null))
      .finally(() => setChecking(false))
  }, [open, topicId, limit])

  function startSession() {
    const params = new URLSearchParams({ limit: String(limit) })
    if (topicId) params.set('topic_id', String(topicId))
    onClose()
    router.push(`/review?${params}`)
  }

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />

      {/* Modal */}
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-sm -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white dark:bg-[#141414]"
        style={{ boxShadow: 'rgba(0,0,0,0.2) 0px 8px 40px, rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
          <div className="flex items-center gap-2">
            <Brain className="h-4 w-4 text-[#666]" />
            <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Cấu hình phiên ôn tập</h2>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#666] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {/* Topic filter */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-2.5">Chủ đề</p>
            <div className="space-y-1">
              <button
                onClick={() => setTopicId(null)}
                className={cn(
                  'w-full flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-left text-[13px] transition-colors',
                  topicId === null
                    ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                    : 'bg-[#f5f5f5] dark:bg-[#222] text-[#555] dark:text-[#aaa] hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a]'
                )}
              >
                <BookOpen className="h-3.5 w-3.5 shrink-0" />
                <span className="font-medium">Tất cả chủ đề</span>
              </button>
              {topics.map(t => (
                <button
                  key={t.id}
                  onClick={() => setTopicId(t.id)}
                  className={cn(
                    'w-full flex items-center gap-2.5 rounded-[8px] px-3 py-2.5 text-left text-[13px] transition-colors',
                    topicId === t.id
                      ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                      : 'bg-[#f5f5f5] dark:bg-[#222] text-[#555] dark:text-[#aaa] hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a]'
                  )}
                >
                  <span className="text-sm shrink-0">{t.icon ?? '📚'}</span>
                  <span className="truncate">{t.name}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Limit */}
          <div>
            <p className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-2.5">Số câu tối đa</p>
            <div className="flex gap-1.5 flex-wrap">
              {LIMIT_OPTIONS.map(l => (
                <button
                  key={l}
                  onClick={() => setLimit(l)}
                  className={cn(
                    'rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-colors',
                    limit === l
                      ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                      : 'bg-[#f5f5f5] dark:bg-[#222] text-[#555] dark:text-[#aaa] hover:bg-[#ebebeb] dark:hover:bg-[#2a2a2a]'
                  )}
                >
                  {LIMIT_LABELS[l]}
                </button>
              ))}
            </div>
          </div>

          {/* Due count preview */}
          <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#1a1a1a] px-4 py-3 flex items-center justify-between"
            style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 0px 0px 1px' }}>
            <div className="flex items-center gap-2">
              <Zap className="h-3.5 w-3.5 text-amber-400" />
              <span className="text-[12px] text-[#666] dark:text-[#888]">Câu đến hạn ôn</span>
            </div>
            {checking ? (
              <Loader2 className="h-3.5 w-3.5 text-[#bbb] animate-spin" />
            ) : (
              <span className={cn(
                'text-[14px] font-bold tabular-nums',
                (dueCount ?? 0) > 0 ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-[#bbb]'
              )}>
                {dueCount ?? '—'}
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5">
          <button
            onClick={startSession}
            disabled={checking || dueCount === 0}
            className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] py-2.5 text-[13px] font-semibold hover:opacity-85 disabled:opacity-40 transition-opacity"
          >
            <Brain className="h-4 w-4" />
            {dueCount === 0 ? 'Không có câu cần ôn' : 'Bắt đầu ôn tập'}
            {(dueCount ?? 0) > 0 && <ChevronRight className="h-3.5 w-3.5" />}
          </button>
          {dueCount === 0 && (
            <p className="text-center text-[11px] text-[#bbb] mt-2">Hẹn gặp lại lần sau! 🎉</p>
          )}
        </div>
      </div>
    </>
  )
}
