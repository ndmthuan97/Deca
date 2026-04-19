'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft, Star, Loader2, Volume2, Puzzle,
  GraduationCap, BookOpen, Trash2, BookMarked
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { getStarredArray, toggleStar } from '@/lib/starred'
import { toast } from 'sonner'
import type { Phrase } from '@/db/schema'

function speak(text: string) {
  if ('speechSynthesis' in window) {
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance(text)
    u.lang = 'en-US'
    window.speechSynthesis.speak(u)
  }
}

export default function StarredPage() {
  const router = useRouter()
  const [phrases, setPhrases]   = useState<Phrase[]>([])
  const [loading, setLoading]   = useState(true)
  const [starredIds, setStarredIds] = useState<number[]>([])

  useEffect(() => {
    const ids = getStarredArray()
    setStarredIds(ids)

    if (ids.length === 0) { setLoading(false); return }

    fetch('/api/starred', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    })
      .then(r => r.json())
      .then((d: { data?: Phrase[] }) => setPhrases(d.data ?? []))
      .catch(() => toast.error('Không thể tải danh sách đã ghim'))
      .finally(() => setLoading(false))
  }, [])

  function unstar(id: number) {
    toggleStar(id)
    setPhrases(prev => prev.filter(p => p.id !== id))
    setStarredIds(prev => prev.filter(i => i !== id))
    toast.success('Đã bỏ ghim')
  }

  const matchUrl = `/match?ids=${starredIds.join(',')}&count=${Math.min(starredIds.length, 8)}`

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">

      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'var(--shadow-nav-bottom)' }}>
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>
          <div className="flex items-center gap-1.5">
            <Star className="h-3.5 w-3.5 text-amber-500 fill-amber-500" />
            <span className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5]">
              Đã ghim ({phrases.length})
            </span>
          </div>
          <div className="w-16" /> {/* spacer */}
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-8 space-y-6">

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
          </div>
        ) : phrases.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#fafafa] dark:bg-[#1a1a1a]"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <BookMarked className="h-7 w-7 text-[#bbb]" />
            </div>
            <div>
              <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Chưa ghim câu nào</p>
              <p className="text-[13px] text-[#999] mt-1">
                Nhấn ⭐ trên thẻ câu trong Review hoặc Topic để ghim lại
              </p>
            </div>
            <Link href="/"
              className="flex items-center gap-2 rounded-[6px] px-4 py-2 text-[13px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              <BookOpen className="h-3.5 w-3.5" /> Xem chủ đề
            </Link>
          </div>
        ) : (
          <>
            {/* Action bar */}
            <div className="flex items-center gap-2">
              <Link href="/review"
                className="flex items-center gap-1.5 rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5] px-4 py-2 text-[13px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
                <GraduationCap className="h-3.5 w-3.5" /> Ôn tập
              </Link>
              {starredIds.length >= 4 && (
                <Link href={matchUrl}
                  className="flex items-center gap-1.5 rounded-[6px] px-4 py-2 text-[13px] font-medium text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
                  style={{ boxShadow: 'var(--shadow-border)' }}>
                  <Puzzle className="h-3.5 w-3.5" /> Match Game
                </Link>
              )}
              <span className="ml-auto text-[12px] text-[#999]">
                {phrases.length} câu đã ghim
              </span>
            </div>

            {/* Phrase list */}
            <div className="space-y-2">
              {phrases.map(p => (
                <div key={p.id}
                  className="rounded-[8px] bg-white dark:bg-[#111] px-4 py-4"
                  style={{ boxShadow: 'var(--shadow-card)' }}>
                  <div className="flex items-start gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-snug">
                        {p.sample_sentence}
                      </p>
                      {p.pronunciation && (
                        <p className="text-[12px] font-mono text-[#999] mt-0.5">{p.pronunciation}</p>
                      )}
                      {p.translation && (
                        <p className="text-[13px] text-[#666] dark:text-[#999] mt-1">{p.translation}</p>
                      )}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        onClick={() => speak(p.sample_sentence)}
                        className="rounded-[6px] p-1.5 text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors">
                        <Volume2 className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => unstar(p.id)}
                        className="rounded-[6px] p-1.5 text-amber-400 hover:text-[#bbb] transition-colors"
                        title="Bỏ ghim">
                        <Star className="h-3.5 w-3.5 fill-current" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </main>
    </div>
  )
}
