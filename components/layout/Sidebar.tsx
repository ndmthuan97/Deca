'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { BookOpen, LayoutList, Menu, X } from 'lucide-react'
import { cn } from '@/lib/utils'

function NavLinks({ collapsed, onClose }: { collapsed?: boolean; onClose?: () => void }) {
  const pathname     = usePathname()
  const isTopicsPage = pathname === '/'
  return (
    <Link
      href="/"
      onClick={onClose}
      className={cn(
        'flex items-center rounded-lg px-2.5 py-2.5 text-sm font-medium transition-all',
        collapsed ? 'justify-center' : 'gap-2.5',
        isTopicsPage
          ? 'bg-orange-50 text-orange-700'
          : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
      )}
      title="Quản lý chủ đề"
    >
      <LayoutList className={cn('h-4 w-4 shrink-0', isTopicsPage ? 'text-orange-500' : 'text-gray-400')} />
      {!collapsed && <span>Quản lý chủ đề</span>}
    </Link>
  )
}

/* ── Mobile hamburger button (rendered outside sidebar by page layout) ── */
export function MobileMenuButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex md:hidden items-center justify-center h-9 w-9 rounded-lg border border-gray-200 bg-white text-gray-500 hover:text-gray-700 shadow-sm"
    >
      <Menu className="h-4.5 w-4.5" />
    </button>
  )
}

/* ── Desktop Sidebar ── */
export function Sidebar() {
  const [mobileOpen, setMobileOpen] = useState(false)

  return (
    <>
      {/* ─── Desktop: hover to expand ─── */}
      <aside className="group/sidebar hidden md:flex relative h-full w-14 flex-col border-r border-gray-200 bg-white transition-all duration-200 hover:w-60 shrink-0">
        {/* Logo */}
        <div className="flex items-center gap-3 border-b border-gray-100 py-4 px-3 overflow-hidden">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow">
            <BookOpen className="h-4 w-4 text-white" />
          </div>
          <div className="opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150 whitespace-nowrap overflow-hidden">
            <h1 className="text-sm font-bold text-gray-900">DACE</h1>
            <p className="text-xs text-gray-400">English Learning</p>
          </div>
        </div>
        <nav className="flex-1 px-1.5 py-4">
          <NavLinks collapsed />
          {/* On hover show text */}
          <div className="absolute inset-y-0 left-0 w-60 flex-col hidden group-hover/sidebar:flex pointer-events-none">
            <div className="flex items-center gap-3 border-b border-gray-100 py-4 px-5 overflow-hidden opacity-0 group-hover/sidebar:opacity-100 transition-opacity duration-150">
              <div className="h-8 w-8 shrink-0" />
              <div>
                <p className="text-sm font-bold text-gray-900">DACE</p>
                <p className="text-xs text-gray-400">English Learning</p>
              </div>
            </div>
            <nav className="flex-1 px-3 py-4 pointer-events-auto">
              <NavLinks />
            </nav>
          </div>
        </nav>
      </aside>

      {/* ─── Mobile: hamburger button ─── */}
      <button
        onClick={() => setMobileOpen(true)}
        className="md:hidden fixed top-3 left-3 z-40 flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 text-white shadow-md"
      >
        <Menu className="h-4 w-4" />
      </button>

      {/* ─── Mobile: slide-over drawer ─── */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          {/* Drawer */}
          <aside className="relative flex h-full w-72 flex-col bg-white shadow-xl">
            {/* Logo + close */}
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <div className="flex items-center gap-3">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 shadow">
                  <BookOpen className="h-5 w-5 text-white" />
                </div>
                <div>
                  <h1 className="text-sm font-bold text-gray-900">DACE</h1>
                  <p className="text-xs text-gray-400">English Learning</p>
                </div>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="rounded-lg p-1.5 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <nav className="flex-1 px-3 py-4">
              <NavLinks onClose={() => setMobileOpen(false)} />
            </nav>
          </aside>
        </div>
      )}
    </>
  )
}
