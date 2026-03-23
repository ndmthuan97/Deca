'use client'

import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Sidebar } from '@/components/layout/Sidebar'
import { BookOpen, Loader2, ChevronRight, Sparkles } from 'lucide-react'
import type { TopicWithCount } from '@/db/schema'

async function fetchTopics(): Promise<TopicWithCount[]> {
  const res = await fetch('/api/topics')
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json()
}

export default function HomePage() {
  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: fetchTopics,
  })

  return (
    <div className="flex h-screen overflow-hidden bg-slate-950">
      <Sidebar />

      <main className="flex-1 overflow-y-auto">
        {/* Hero */}
        <div className="relative overflow-hidden border-b border-white/10 bg-gradient-to-br from-slate-900 via-violet-950/30 to-slate-900 px-8 py-14">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-violet-600/10 via-transparent to-transparent" />
          <div className="relative">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-violet-500/30 bg-violet-500/10 px-3 py-1 text-xs font-medium text-violet-300">
              <Sparkles className="h-3.5 w-3.5" />
              AI-Powered English Learning
            </div>
            <h1 className="mb-3 text-4xl font-bold tracking-tight text-white">
              Học giao tiếp{' '}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">
                tiếng Anh
              </span>
            </h1>
            <p className="max-w-xl text-slate-400">
              Nhập câu mẫu, AI sẽ tự động phân tích cấu trúc, dịch nghĩa, phát âm và tạo ví dụ.
              Học theo chủ đề từ cơ bản đến nâng cao.
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 divide-x divide-white/5 border-b border-white/10">
          {[
            { label: 'Chủ đề', value: topics?.length ?? '—', icon: '📚' },
            {
              label: 'Tổng câu',
              value: topics?.reduce((sum, t) => sum + (t.phrase_count ?? 0), 0) ?? '—',
              icon: '💬',
            },
            { label: 'AI phân tích', value: '✨', icon: '🤖' },
          ].map((s) => (
            <div key={s.label} className="px-8 py-5">
              <div className="text-2xl font-bold text-white">{s.icon} {s.value}</div>
              <div className="text-xs text-slate-500">{s.label}</div>
            </div>
          ))}
        </div>

        {/* Topics Grid */}
        <div className="p-8">
          <h2 className="mb-6 text-lg font-semibold text-white">Chọn chủ đề để học</h2>

          {isLoading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-violet-500" />
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-4">
              {topics?.map((topic) => (
                <Link key={topic.id} href={`/topics/${topic.id}`}>
                  <div className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-slate-800/60 to-slate-900/60 p-5 transition-all duration-300 hover:-translate-y-1 hover:border-violet-500/40 hover:shadow-xl hover:shadow-violet-500/10">
                    <div className="mb-3 text-3xl">{topic.icon}</div>
                    <h3 className="mb-1 font-semibold text-white group-hover:text-violet-300 transition-colors">
                      {topic.name}
                    </h3>
                    {topic.description && (
                      <p className="mb-3 text-xs leading-relaxed text-slate-500 line-clamp-2">
                        {topic.description}
                      </p>
                    )}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-slate-500">
                        {topic.phrase_count ?? 0} câu
                      </span>
                      <ChevronRight className="h-4 w-4 text-slate-600 transition-all group-hover:translate-x-1 group-hover:text-violet-400" />
                    </div>

                    {/* Hover glow */}
                    <div className="absolute inset-0 -z-10 rounded-2xl bg-violet-600/0 transition-all duration-300 group-hover:bg-violet-600/5" />
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
