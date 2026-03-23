'use client'

import { useState, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Loader2, BookOpen } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Suspense } from 'react'

function PinForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const from = searchParams.get('from') || '/'
  const [pin, setPin] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!pin.trim()) return

    setLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/pin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pin }),
      })

      if (!res.ok) {
        const data = await res.json()
        setError(data.error || 'Sai PIN!')
        setPin('')
        inputRef.current?.focus()
      } else {
        router.push(from)
        router.refresh()
      }
    } catch {
      setError('Lỗi kết nối, thử lại!')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-br from-slate-950 via-violet-950/20 to-slate-950 px-4">
      {/* Background decoration */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-40 -top-40 h-96 w-96 rounded-full bg-violet-600/10 blur-3xl" />
        <div className="absolute -bottom-40 -right-40 h-96 w-96 rounded-full bg-indigo-600/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-sm">
        {/* Logo */}
        <div className="mb-8 flex flex-col items-center">
          <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 shadow-2xl shadow-violet-500/30">
            <BookOpen className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-white">DACE</h1>
          <p className="mt-1 text-sm text-slate-400">English Learning</p>
        </div>

        {/* Card */}
        <div className="rounded-2xl border border-white/10 bg-slate-900/80 p-8 shadow-2xl backdrop-blur-sm">
          <h2 className="mb-1 text-center text-lg font-semibold text-white">
            Nhập mã PIN
          </h2>
          <p className="mb-6 text-center text-sm text-slate-500">
            Vui lòng nhập PIN để tiếp tục
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <Input
              ref={inputRef}
              id="pin-input"
              type="password"
              placeholder="••••••••"
              value={pin}
              onChange={(e) => setPin(e.target.value)}
              autoFocus
              autoComplete="current-password"
              className="h-12 border-white/10 bg-white/5 text-center text-xl tracking-widest text-white placeholder:tracking-normal focus:border-violet-500 focus:ring-violet-500/20"
            />

            {error && (
              <p className="flex items-center justify-center gap-2 text-center text-sm text-red-400">
                <span className="text-base">⚠️</span> {error}
              </p>
            )}

            <Button
              type="submit"
              disabled={loading || !pin.trim()}
              className="h-12 w-full bg-gradient-to-r from-violet-600 to-indigo-600 text-base font-semibold text-white hover:from-violet-500 hover:to-indigo-500 disabled:opacity-50"
            >
              {loading ? (
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
              ) : (
                '🔓 Truy cập'
              )}
            </Button>
          </form>
        </div>

        <p className="mt-4 text-center text-xs text-slate-600">
          Được bảo vệ bởi mã PIN
        </p>
      </div>
    </div>
  )
}

export default function PinPage() {
  return (
    <Suspense fallback={null}>
      <PinForm />
    </Suspense>
  )
}
