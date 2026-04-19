'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen, LayoutList, Menu, X, Flame, GraduationCap,
  Search, BarChart2, Brain, ChevronRight, Settings,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { getStreak, studiedToday } from '@/lib/streak'

/* ── Streak badge (orange stays — semantic learning indicator) ── */
function StreakBadge({ mini }: { mini?: boolean }) {
  const [streak, setStreak] = useState(0)
  const [studied, setStudied] = useState(false)

  useEffect(() => {
    const data = getStreak()
    setStreak(data.count)
    setStudied(studiedToday())
  }, [])

  if (streak === 0) return null

  return (
    <span className={cn(
      'inline-flex items-center gap-0.5 rounded-full text-xs font-bold',
      mini ? 'px-1.5 py-0.5' : 'px-2 py-0.5',
      studied
        ? 'bg-orange-100 text-orange-600 dark:bg-orange-900/40 dark:text-orange-400'
        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-500',
    )}>
      <Flame className="h-3 w-3 shrink-0" />
      {!mini && <span>{streak}</span>}
    </span>
  )
}

/* ── Nav items config ── */
const NAV_ITEMS = [
  { href: '/',          icon: LayoutList,    label: 'Chủ đề',    title: 'Quản lý chủ đề' },
  { href: '/review',    icon: GraduationCap, label: 'Ôn tập',    title: 'Ôn tập hôm nay', streak: true },
  { href: '/dashboard', icon: BarChart2,     label: 'Dashboard', title: 'Thống kê học tập' },
] as const

/* ── Desktop Sidebar ── */
export function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  return (
    <>
      {/* ─── Desktop Sidebar ─── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          // Vercel nav: white bg, shadow-as-border replaces hard border-r
          'hidden md:flex flex-col h-full bg-white dark:bg-[#111111]',
          'transition-[width] shrink-0 overflow-hidden',
          'shadow-[rgba(0,0,0,0.08)_1px_0px_0px_0px] dark:shadow-[rgba(255,255,255,0.06)_1px_0px_0px_0px]',
          expanded ? 'w-56' : 'w-14',
        )}
        style={{ zIndex: 10 }}
      >
        {/* Logo — bottom shadow-border */}
        <div
          className="flex items-center gap-3 px-3 py-4 h-[60px] overflow-hidden"
          style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
        >
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5]">
            <BookOpen className="h-4 w-4 text-white dark:text-[#171717]" />
          </div>
          <div className={cn('transition-opacity min-w-0', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
            <p className="text-sm font-semibold text-[#171717] dark:text-[#f5f5f5] whitespace-nowrap tracking-tight">DACE</p>
            <p className="text-[11px] text-[#666666] dark:text-[#888888] whitespace-nowrap">English Learning</p>
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-1.5 py-3 space-y-0.5 overflow-hidden">
          {NAV_ITEMS.map(({ href, icon: Icon, label, title, streak }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                title={expanded ? undefined : title}
                className={cn(
                  // Vercel nav: 14px weight-500 default, weight-600 active, no colored bg
                  'flex items-center gap-2.5 rounded-[6px] px-2.5 py-2.5 whitespace-nowrap',
                  'text-[14px] transition-colors',
                  active
                    ? 'font-semibold text-[#171717] bg-[#f5f5f5] dark:bg-white/8 dark:text-[#f5f5f5]'
                    : 'font-medium text-[#666666] hover:text-[#171717] hover:bg-[#fafafa] dark:text-[#888888] dark:hover:text-[#f5f5f5] dark:hover:bg-white/5',
                )}
              >
                <Icon className={cn(
                  'h-4 w-4 shrink-0',
                  active ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-[#999999] dark:text-[#666666]'
                )} />
                <span className={cn(
                  'flex-1 transition-opacity',
                  expanded ? 'opacity-100' : 'opacity-0 pointer-events-none'
                )}>
                  {label}
                </span>
                {streak && expanded && <StreakBadge />}
                {streak && !expanded && <StreakBadge mini />}
              </Link>
            )
          })}

          {/* Search shortcut */}
          <button
            onClick={() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true }))}
            title={expanded ? undefined : 'Tìm kiếm (Ctrl+K)'}
            className="w-full flex items-center gap-2.5 rounded-[6px] px-2.5 py-2.5 text-[14px] font-medium text-[#666666] hover:text-[#171717] hover:bg-[#fafafa] dark:text-[#888888] dark:hover:text-[#f5f5f5] dark:hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <Search className="h-4 w-4 shrink-0 text-[#999999] dark:text-[#666666]" />
            <span className={cn('flex-1 text-left transition-opacity', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
              Tìm kiếm
            </span>
            {expanded && (
              <kbd className="inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono text-[#999999] dark:text-[#666666]"
                style={{ boxShadow: 'rgb(235, 235, 235) 0px 0px 0px 1px' }}>
                ⌘K
              </kbd>
            )}
          </button>
        </nav>

        {/* Theme toggle + Admin */}
        <div
          className="px-1.5 py-2 space-y-0.5"
          style={{ boxShadow: 'rgba(0,0,0,0.06) 0px -1px 0px 0px' }}
        >
          <Link
            href="/admin"
            title={expanded ? undefined : 'Admin Panel'}
            className="flex items-center gap-2.5 rounded-[6px] px-2.5 py-2 text-[14px] font-medium text-[#666666] hover:text-[#171717] hover:bg-[#fafafa] dark:text-[#888888] dark:hover:text-[#f5f5f5] dark:hover:bg-white/5 transition-colors whitespace-nowrap"
          >
            <Settings className="h-4 w-4 shrink-0 text-[#999999] dark:text-[#666666]" />
            <span className={cn('flex-1 text-left transition-opacity text-[13px]', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
              Admin
            </span>
          </Link>
          {expanded ? <ThemeToggle /> : <ThemeToggle collapsed />}
        </div>
      </aside>

      {/* ─── Mobile: hamburger ─── */}
      <button
        onClick={() => setMobileOpen(true)}
        aria-label="Mở menu"
        className="md:hidden fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] shadow-lg active:scale-95 transition-transform"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* ─── Mobile: backdrop ─── */}
      <div
        className={cn(
          'md:hidden fixed inset-0 z-50 bg-black/40 backdrop-blur-sm transition-opacity',
          mobileOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none',
        )}
        onClick={() => setMobileOpen(false)}
      />

      {/* ─── Mobile: drawer ─── */}
      <aside className={cn(
        'md:hidden fixed top-0 left-0 z-50 flex h-full w-72 flex-col bg-white dark:bg-[#111111]',
        'transition-transform',
        mobileOpen ? 'translate-x-0' : '-translate-x-full',
      )}
        style={{ boxShadow: 'rgba(0,0,0,0.15) 4px 0px 16px 0px' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4"
          style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
        >
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5]">
              <BookOpen className="h-5 w-5 text-white dark:text-[#171717]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#171717] dark:text-[#f5f5f5] tracking-tight">DACE</h2>
              <p className="text-[11px] text-[#666666] dark:text-[#888888]">English Learning</p>
            </div>
          </div>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded-[6px] p-1.5 text-[#666666] hover:bg-[#fafafa] dark:hover:bg-white/8 hover:text-[#171717] dark:text-[#888888] dark:hover:text-[#f5f5f5] transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          {NAV_ITEMS.map(({ href, icon: Icon, label, streak }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'flex items-center gap-3 rounded-[6px] px-3.5 py-3 text-[14px] transition-colors',
                  active
                    ? 'font-semibold text-[#171717] bg-[#f5f5f5] dark:bg-white/8 dark:text-[#f5f5f5]'
                    : 'font-medium text-[#666666] hover:text-[#171717] hover:bg-[#fafafa] dark:text-[#888888] dark:hover:text-[#f5f5f5] dark:hover:bg-white/5',
                )}
              >
                <Icon className={cn(
                  'h-5 w-5 shrink-0',
                  active ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-[#999999]'
                )} />
                <span className="flex-1">{label}</span>
                {streak && <StreakBadge />}
                {active && <ChevronRight className="h-3.5 w-3.5 text-[#999999]" />}
              </Link>
            )
          })}

          {/* Search */}
          <button
            onClick={() => {
              setMobileOpen(false)
              setTimeout(() => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', ctrlKey: true, bubbles: true })), 150)
            }}
            className="w-full flex items-center gap-3 rounded-[6px] px-3.5 py-3 text-[14px] font-medium text-[#666666] dark:text-[#888888] hover:bg-[#fafafa] dark:hover:bg-white/5 hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
          >
            <Search className="h-5 w-5 shrink-0 text-[#999999]" />
            <span className="flex-1 text-left">Tìm kiếm</span>
            <kbd className="inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono text-[#999999]"
              style={{ boxShadow: 'rgb(235, 235, 235) 0px 0px 0px 1px' }}>
              Ctrl K
            </kbd>
          </button>
        </nav>

        {/* Theme + footer */}
        <div style={{ boxShadow: 'rgba(0,0,0,0.06) 0px -1px 0px 0px' }}>
          <ThemeToggle />
          <div className="px-3 pb-4 space-y-1">
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 w-full rounded-[6px] px-3 py-2 text-xs text-[#666666] dark:text-[#888888] hover:bg-[#fafafa] dark:hover:bg-white/5 hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
            >
              <Settings className="h-3.5 w-3.5 flex-shrink-0" />
              <span>Admin Panel</span>
            </Link>
            <p className="px-3 text-[11px] text-[#999999] dark:text-[#666666]">
              DACE v0.1 · Học tiếng Anh mỗi ngày
            </p>
          </div>
        </div>
      </aside>
    </>
  )
}
