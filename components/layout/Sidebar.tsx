'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LayoutList } from 'lucide-react'
import { cn } from '@/lib/utils'

export function Sidebar() {
  const pathname = usePathname()
  const isTopicsPage = pathname === '/'

  return (
    <aside className="flex h-full w-60 flex-col border-r border-gray-200 bg-white">
      {/* Logo */}
      <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-4">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow">
          <BookOpen className="h-5 w-5 text-white" />
        </div>
        <div>
          <h1 className="text-sm font-bold text-gray-900">DACE</h1>
          <p className="text-xs text-gray-400">English Learning</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4">
        <Link
          href="/"
          className={cn(
            'flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm font-medium transition-all',
            isTopicsPage
              ? 'bg-orange-50 text-orange-700'
              : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
          )}
        >
          <LayoutList className={cn('h-4.5 w-4.5', isTopicsPage ? 'text-orange-500' : 'text-gray-400')} />
          Quản lý chủ đề
        </Link>
      </nav>
    </aside>
  )
}
