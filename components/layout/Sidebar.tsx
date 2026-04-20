'use client'

import React, { useState, useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  BookOpen, LayoutList, Menu, X, Flame,
  Search, BarChart2, ChevronRight, Settings, MessageSquare, Wrench,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { ThemeToggle } from '@/components/ui/ThemeToggle'
import { getStreak, studiedToday } from '@/lib/streak'
import { XPBar } from '@/components/xp/XPBar'
import { GlobalSearch } from '@/components/search/GlobalSearch'
import { ReviewSessionConfig } from '@/components/review/ReviewSessionConfig'

/* ── Streak badge ── */
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

/* ── Nav items — logical study flow ── */
const NAV_ITEMS = [
  { href: '/',             icon: LayoutList,    label: 'Chủ đề',    title: 'Danh sách chủ đề' },
  { href: '/dashboard',    icon: BarChart2,     label: 'Dashboard', title: 'Thống kê học tập' },
  { href: '/conversation', icon: MessageSquare, label: 'Chat',      title: 'Luyện hội thoại' },
] as const

export function Sidebar() {
  const pathname = usePathname()
  const [expanded, setExpanded] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [searchOpen, setSearchOpen] = useState(false)
  const [reviewConfigOpen, setReviewConfigOpen] = useState(false)

  useEffect(() => { setMobileOpen(false) }, [pathname])

  const isActive = (href: string) => href === '/' ? pathname === '/' : pathname.startsWith(href)

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        setSearchOpen(o => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])

  // Shared class helpers
  const navLinkCls = (active: boolean) => cn(
    'flex items-center gap-2.5 rounded-[6px] px-2.5 py-2.5 whitespace-nowrap text-[14px] transition-colors',
    active
      ? 'font-semibold text-[#171717] bg-[#f5f5f5] dark:bg-white/8 dark:text-[#f5f5f5]'
      : 'font-medium text-[#666666] hover:text-[#171717] hover:bg-[#fafafa] dark:text-[#888888] dark:hover:text-[#f5f5f5] dark:hover:bg-white/5'
  )
  const iconCls = (active: boolean) => cn(
    'h-4 w-4 shrink-0',
    active ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-[#999999] dark:text-[#666666]'
  )
  const labelCls = cn('flex-1 transition-opacity', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')

  return (
    <>
      <GlobalSearch open={searchOpen} onClose={() => setSearchOpen(false)} />
      <ReviewSessionConfig open={reviewConfigOpen} onClose={() => setReviewConfigOpen(false)} />

      {/* ─── Desktop Sidebar ─── */}
      <aside
        onMouseEnter={() => setExpanded(true)}
        onMouseLeave={() => setExpanded(false)}
        className={cn(
          'hidden md:flex flex-col h-full bg-white dark:bg-[#111111]',
          'transition-[width] shrink-0 overflow-hidden',
          'shadow-[rgba(0,0,0,0.08)_1px_0px_0px_0px] dark:shadow-[rgba(255,255,255,0.06)_1px_0px_0px_0px]',
          expanded ? 'w-56' : 'w-14',
        )}
        style={{ zIndex: 10 }}
      >
        {/* Logo */}
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

        {/* ── Main nav ── */}
        <nav className="flex-1 px-1.5 py-3 space-y-0.5 overflow-hidden">
          {NAV_ITEMS.map(({ href, icon: Icon, label, title }) => {
            const active = isActive(href)
            return (
              <Link
                key={href}
                href={href}
                title={expanded ? undefined : title}
                className={navLinkCls(active)}
              >
                <Icon className={iconCls(active)} />
                <span className={labelCls}>{label}</span>
              </Link>
            )
          })}

          {/* Search */}
          <button
            onClick={() => setSearchOpen(true)}
            title={expanded ? undefined : 'Tìm kiếm (Ctrl+K)'}
            className={cn(navLinkCls(false), 'w-full')}
          >
            <Search className="h-4 w-4 shrink-0 text-[#999999] dark:text-[#666666]" />
            <span className={cn('flex-1 text-left transition-opacity', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
              Tìm kiếm
            </span>
            {expanded && (
              <kbd
                className="inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono text-[#999999] dark:text-[#666666]"
                style={{ boxShadow: 'rgb(235, 235, 235) 0px 0px 0px 1px' }}
              >
                ⌘K
              </kbd>
            )}
          </button>

          {/* Daily Dictation */}
          <a
            href="https://dailydictation.com/exercises"
            target="_blank"
            rel="noopener noreferrer"
            title={expanded ? undefined : 'Daily Dictation'}
            className={navLinkCls(false)}
          >
            <span className="h-4 w-4 shrink-0 flex items-center justify-center text-[14px] leading-none select-none">🎧</span>
            <span className={cn('flex-1 text-left transition-opacity', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
              Daily Dictation
            </span>
            {expanded && (
              <svg className="h-3 w-3 shrink-0 text-[#ccc]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3.5 8.5L8.5 3.5M8.5 3.5H5M8.5 3.5V7"/>
              </svg>
            )}
          </a>

          {/* NotebookLM */}
          <Link
            href="/notebooklm"
            title={expanded ? undefined : 'NotebookLM'}
            className={navLinkCls(isActive('/notebooklm'))}
          >
            <span className="h-4 w-4 shrink-0 flex items-center justify-center text-[14px] leading-none select-none">📓</span>
            <span className={cn('flex-1 text-left transition-opacity', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
              NotebookLM
            </span>
          </Link>
        </nav>

        {/* ── Bottom: Settings + Admin + Theme + XP ── */}
        <div
          className="px-1.5 py-2 space-y-0.5"
          style={{ boxShadow: 'rgba(0,0,0,0.06) 0px -1px 0px 0px' }}
        >
          <Link
            href="/settings"
            title={expanded ? undefined : 'Cài đặt'}
            className={navLinkCls(isActive('/settings'))}
          >
            <Settings className={iconCls(isActive('/settings'))} />
            <span className={cn('flex-1 text-left transition-opacity text-[13px]', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
              Cài đặt
            </span>
          </Link>
          <Link
            href="/admin"
            title={expanded ? undefined : 'Admin'}
            className={navLinkCls(isActive('/admin'))}
          >
            <Wrench className={iconCls(isActive('/admin'))} />
            <span className={cn('flex-1 text-left transition-opacity text-[13px]', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
              Admin
            </span>
          </Link>
          {expanded ? <ThemeToggle /> : <ThemeToggle collapsed />}
          <div className={cn('px-2 py-1.5 overflow-hidden transition-all', expanded ? 'opacity-100' : 'opacity-0 pointer-events-none')}>
            <XPBar compact />
          </div>
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
      <aside
        className={cn(
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
          {/* Main items */}
          {NAV_ITEMS.map(({ href, icon: Icon, label }) => {
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
                <Icon className={cn('h-5 w-5 shrink-0', active ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-[#999999]')} />
                <span className="flex-1">{label}</span>
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
            <kbd
              className="inline-flex items-center rounded-[4px] px-1.5 py-0.5 text-[10px] font-mono text-[#999999]"
              style={{ boxShadow: 'rgb(235, 235, 235) 0px 0px 0px 1px' }}
            >
              Ctrl K
            </kbd>
          </button>

          {/* Daily Dictation */}
          <a
            href="https://dailydictation.com/exercises"
            target="_blank"
            rel="noopener noreferrer"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-[6px] px-3.5 py-3 text-[14px] font-medium text-[#666666] dark:text-[#888888] hover:bg-[#fafafa] dark:hover:bg-white/5 hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
          >
            <span className="h-5 w-5 shrink-0 flex items-center justify-center text-[16px] leading-none">🎧</span>
            <span className="flex-1">Daily Dictation</span>
            <svg className="h-3.5 w-3.5 shrink-0 text-[#ccc]" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3.5 8.5L8.5 3.5M8.5 3.5H5M8.5 3.5V7"/>
            </svg>
          </a>

          {/* NotebookLM */}
          <Link
            href="/notebooklm"
            onClick={() => setMobileOpen(false)}
            className="flex items-center gap-3 rounded-[6px] px-3.5 py-3 text-[14px] font-medium text-[#666666] dark:text-[#888888] hover:bg-[#fafafa] dark:hover:bg-white/5 hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
          >
            <span className="h-5 w-5 shrink-0 flex items-center justify-center text-[16px] leading-none">📓</span>
            <span className="flex-1">NotebookLM</span>
          </Link>
        </nav>

        {/* Footer: Theme + Settings + Admin */}
        <div style={{ boxShadow: 'rgba(0,0,0,0.06) 0px -1px 0px 0px' }}>
          <ThemeToggle />
          <div className="px-3 pb-4 space-y-0.5">
            <Link
              href="/settings"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 w-full rounded-[6px] px-3 py-2 text-[13px] font-medium text-[#666666] dark:text-[#888888] hover:bg-[#fafafa] dark:hover:bg-white/5 hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
            >
              <Settings className="h-4 w-4 flex-shrink-0" />
              <span>Cài đặt</span>
            </Link>
            <Link
              href="/admin"
              onClick={() => setMobileOpen(false)}
              className="flex items-center gap-2.5 w-full rounded-[6px] px-3 py-2 text-[13px] font-medium text-[#666666] dark:text-[#888888] hover:bg-[#fafafa] dark:hover:bg-white/5 hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
            >
              <Wrench className="h-4 w-4 flex-shrink-0" />
              <span>Admin</span>
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
