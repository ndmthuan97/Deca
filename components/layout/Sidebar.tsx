'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { BookOpen, Plus, Loader2 } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { TopicWithCount } from '@/db/schema'

async function fetchTopics(): Promise<TopicWithCount[]> {
  const res = await fetch('/api/topics')
  if (!res.ok) throw new Error('Failed to fetch topics')
  return res.json()
}

interface SidebarProps {
  onAddTopic?: () => void
}

export function Sidebar({ onAddTopic }: SidebarProps) {
  const pathname = usePathname()
  const { data: topics, isLoading } = useQuery({
    queryKey: ['topics'],
    queryFn: fetchTopics,
  })

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900">DACE</h1>
          <p className="text-xs text-gray-400">English Learning</p>
        </div>
      </div>

      {/* Topics List */}
      <nav className="flex-1 overflow-y-auto px-3 py-4">
        <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
          Topics
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-4 w-4 animate-spin text-gray-300" />
          </div>
        ) : (
          <ul className="space-y-0.5">
            {topics?.map((topic) => {
              const isActive = pathname === `/topics/${topic.id}`
              return (
                <li key={topic.id}>
                  <Link
                    href={`/topics/${topic.id}`}
                    className={cn(
                      'group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm transition-all',
                      isActive
                        ? 'bg-violet-50 text-violet-700 font-medium'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                    )}
                  >
                    <span className="text-base">{topic.icon}</span>
                    <span className="flex-1 truncate">{topic.name}</span>
                    {topic.phrase_count != null && topic.phrase_count > 0 && (
                      <span className={cn(
                        'rounded-full px-1.5 py-0.5 text-[11px] font-medium',
                        isActive ? 'bg-violet-100 text-violet-600' : 'bg-gray-100 text-gray-500'
                      )}>
                        {topic.phrase_count}
                      </span>
                    )}
                  </Link>
                </li>
              )
            })}
          </ul>
        )}
      </nav>

      {/* Add Topic */}
      <div className="border-t border-gray-100 p-3">
        <button
          onClick={onAddTopic}
          className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-sm text-gray-500 hover:bg-gray-50 hover:text-gray-900 transition-colors"
        >
          <Plus className="h-4 w-4" />
          Thêm chủ đề mới
        </button>
      </div>
    </aside>
  )
}
