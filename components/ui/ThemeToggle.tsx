'use client'

import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'
import { Sun, Moon, Monitor } from 'lucide-react'
import { cn } from '@/lib/utils'

export function ThemeToggle({ collapsed }: { collapsed?: boolean }) {
  const { theme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  // Chỉ render sau khi mount để tránh hydration mismatch
  useEffect(() => setMounted(true), [])

  const options = [
    { value: 'light',  icon: Sun,     label: 'Sáng' },
    { value: 'system', icon: Monitor, label: 'Hệ thống' },
    { value: 'dark',   icon: Moon,    label: 'Tối' },
  ] as const

  if (!mounted) {
    // Placeholder cùng kích thước để không có layout shift
    return collapsed
      ? <div className="flex w-full items-center justify-center p-2.5"><div className="h-4 w-4" /></div>
      : <div className="px-3 py-2 h-[56px]" />
  }

  if (collapsed) {
    const current = options.find(o => o.value === theme) ?? options[1]
    const next = options[(options.indexOf(current) + 1) % options.length]
    const Icon = current.icon
    return (
      <button
        onClick={() => setTheme(next.value)}
        className="flex w-full items-center justify-center rounded-lg p-2.5 text-gray-400 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-500 dark:hover:bg-gray-800 dark:hover:text-gray-300 transition-colors"
        title={`Theme: ${current.label} (bấm để đổi)`}
      >
        <Icon className="h-4 w-4" />
      </button>
    )
  }

  return (
    <div className="px-3 py-2">
      <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-600">Giao diện</p>
      <div className="flex items-center rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 p-0.5 gap-0.5">
        {options.map(({ value, icon: Icon, label }) => (
          <button
            key={value}
            onClick={() => setTheme(value)}
            className={cn(
              'flex flex-1 items-center justify-center gap-1 rounded-md py-1.5 text-[11px] font-medium transition-colors',
              theme === value
                ? 'bg-white dark:bg-gray-700 text-gray-800 dark:text-gray-100 shadow-sm'
                : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-400'
            )}
            title={label}
          >
            <Icon className="h-3 w-3" />
          </button>
        ))}
      </div>
    </div>
  )
}
