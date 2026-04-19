'use client'
import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { Lock, ShieldCheck, RefreshCw, Trash2, Mic, Sparkles, Play, Square, ArrowLeft } from 'lucide-react'

interface Stats { total: number; null_pronunciation: number; null_example1: number }

type SSEEvent =
  | { type: 'progress'; step: string; current: number; total: number; label: string }
  | { type: 'done'; summary: string }
  | { type: 'error'; message: string }

interface Progress { step: string; current: number; total: number; label: string }

const SESSION_KEY = 'dace_admin_auth'

const ACTIONS = [
  { id: 'dedup',         label: 'Xóa câu trùng lặp',       desc: 'Giữ câu ID nhỏ nhất trong cùng topic',        icon: Trash2,    color: 'text-red-400',    ring: 'ring-red-500/40',    bg: 'bg-red-500/10' },
  { id: 'pronunciation', label: 'Fill Pronunciation (IPA)', desc: 'Điền phiên âm IPA cho tất cả câu đang null',  icon: Mic,       color: 'text-blue-400',   ring: 'ring-blue-500/40',   bg: 'bg-blue-500/10' },
  { id: 'examples',      label: 'Generate Examples (AI)',   desc: 'Groq AI tạo example1/2 + dịch — không giới hạn', icon: Sparkles, color: 'text-purple-400', ring: 'ring-purple-500/40', bg: 'bg-purple-500/10' },
] as const

function ProgressBar({ progress, active }: { progress: Progress | null; active: boolean }) {
  if (!active && !progress) return null
  const pct = progress && progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0
  return (
    <div className="bg-[#fafafa] dark:bg-[#111] border border-[#eaeaea] dark:border-[#333] rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-widest text-[#666]">Tiến trình</span>
        <span className="text-sm font-mono font-bold text-[#171717] dark:text-[#f5f5f5] tabular-nums">{pct}%</span>
      </div>
      <div className="h-1.5 bg-[#eaeaea] dark:bg-[#333] rounded-full overflow-hidden">
        <div
          className="h-full bg-[#171717] dark:bg-[#f5f5f5] rounded-full transition-all duration-500 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="text-[12px] text-[#666] dark:text-[#888] leading-relaxed min-h-[1.25rem]">
        {active && !progress
          ? <span className="flex items-center gap-1.5"><RefreshCw className="h-3 w-3 animate-spin" />Đang khởi động...</span>
          : progress?.label}
      </p>
      {progress && progress.total > 1 && (
        <p className="text-[11px] font-mono text-[#aaa] dark:text-[#555] text-right tabular-nums">
          {progress.current.toLocaleString()} / {progress.total.toLocaleString()}
        </p>
      )}
    </div>
  )
}

export default function AdminPage() {
  const [authed, setAuthed]           = useState(false)
  const [pw, setPw]                   = useState('')
  const [pwError, setPwError]         = useState('')
  const [checking, setChecking]       = useState(false)
  const [stats, setStats]             = useState<Stats | null>(null)
  const [statsLoading, setStatsLoading] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string | null>(null)
  const [selected, setSelected]       = useState<Set<string>>(new Set(['dedup', 'pronunciation', 'examples']))
  const [running, setRunning]         = useState(false)
  const [progress, setProgress]       = useState<Progress | null>(null)
  const [log, setLog]                 = useState<string[]>([])
  const abortRef                      = useRef<AbortController | null>(null)

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY) === '1') setAuthed(true)
  }, [])

  useEffect(() => {
    if (authed) fetchStats()
  }, [authed])

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setChecking(true); setPwError('')
    const r = await fetch('/api/admin/auth', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ password: pw }),
    })
    if (r.ok) { sessionStorage.setItem(SESSION_KEY, '1'); setAuthed(true) }
    else setPwError('Sai mật khẩu, thử lại!')
    setChecking(false)
  }

  async function fetchStats() {
    setStatsLoading(true)
    try {
      const r = await fetch('/api/admin/fix-phrases')
      const j = await r.json() as { data: Stats }
      setStats(j.data)
      setLastRefreshed(new Date().toLocaleTimeString('vi-VN'))
    } finally { setStatsLoading(false) }
  }

  const addLog = (msg: string) => setLog(prev => [`[${new Date().toLocaleTimeString()}] ${msg}`, ...prev].slice(0, 50))

  function toggleSelect(id: string) {
    setSelected(prev => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleAll() {
    if (selected.size === ACTIONS.length) setSelected(new Set())
    else setSelected(new Set(ACTIONS.map(a => a.id)))
  }

  async function runSelected() {
    if (running || selected.size === 0) return
    setRunning(true); setProgress(null)
    const actionStr = [...selected].join('+')
    addLog(`⏳ Chạy: ${[...selected].map(id => ACTIONS.find(a => a.id === id)?.label).join(', ')}`)
    abortRef.current = new AbortController()

    try {
      // Run selected actions sequentially via 'all' with a custom combo
      // We send each selected action one by one
      for (const actionId of ['dedup', 'pronunciation', 'examples'].filter(id => selected.has(id))) {
        if (abortRef.current.signal.aborted) break
        const res = await fetch('/api/admin/fix-phrases', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: actionId, limit: 99999 }),
          signal: abortRef.current.signal,
        })
        if (!res.body) continue
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buffer = ''
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n\n')
          buffer = lines.pop() ?? ''
          for (const chunk of lines) {
            const raw = chunk.replace(/^data: /, '').trim()
            if (!raw) continue
            try {
              const ev = JSON.parse(raw) as SSEEvent
              if (ev.type === 'progress') setProgress({ step: ev.step, current: ev.current, total: ev.total, label: ev.label })
              else if (ev.type === 'done')  { addLog(`✅ ${ev.summary}`); setProgress(null) }
              else if (ev.type === 'error') { addLog(`❌ ${ev.message}`); setProgress(null) }
            } catch { /* skip */ }
          }
        }
      }
      await fetchStats()
    } catch (e: unknown) {
      if ((e as { name?: string }).name !== 'AbortError') addLog(`❌ ${String(e)}`)
    } finally {
      setRunning(false); setProgress(null)
    }
    void actionStr
  }

  function stopAction() {
    abortRef.current?.abort()
    addLog('⛔ Dừng bởi người dùng')
    setRunning(false); setProgress(null)
  }

  // ── Password Gate ──────────────────────────────────────────────────────────
  if (!authed) return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] flex items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-5">
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-[8px] mb-2" style={{ boxShadow: 'var(--shadow-card)' }}>
            <Lock className="h-5 w-5 text-[#666]" />
          </div>
          <h1 className="text-[18px] font-semibold text-[#171717] dark:text-[#f5f5f5] tracking-tight">Admin Panel</h1>
          <p className="text-[13px] text-[#666] dark:text-[#888]">Nhập mật khẩu để tiếp tục</p>
        </div>
        <form onSubmit={handleLogin} className="space-y-3">
          <input type="password" value={pw} autoFocus
            onChange={e => { setPw(e.target.value); setPwError('') }}
            placeholder="Mật khẩu..."
            className="w-full rounded-[6px] text-[14px] text-[#171717] dark:text-[#f5f5f5] bg-white dark:bg-[#111] px-3 py-2 outline-none placeholder:text-[#999]"
            style={{ boxShadow: 'rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
          />
          {pwError && <p className="text-[12px] text-red-500 text-center">{pwError}</p>}
          <button type="submit" disabled={checking || !pw}
            className="w-full py-2.5 rounded-[6px] bg-[#171717] dark:bg-white text-white dark:text-[#171717] text-[14px] font-medium disabled:opacity-40 transition-colors hover:bg-black dark:hover:bg-[#f5f5f5]">
            {checking ? 'Đang kiểm tra...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  )

  // ── Admin UI ───────────────────────────────────────────────────────────────
  const allSelected = selected.size === ACTIONS.length
  const noneSelected = selected.size === 0

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a] text-[#171717] dark:text-[#f5f5f5] p-6 md:p-10">
      <div className="max-w-xl mx-auto space-y-4">

        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="h-4 w-4 text-[#666]" />
            <h1 className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5] tracking-tight">DACE Admin</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/"
              className="flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors px-2.5 py-1.5 rounded-[6px] hover:bg-[#fafafa] dark:hover:bg-white/5">
              <ArrowLeft className="h-3.5 w-3.5" />Về trang chính
            </Link>
            <button onClick={() => { sessionStorage.removeItem(SESSION_KEY); setAuthed(false) }}
              className="text-[12px] text-[#aaa] hover:text-[#666] transition-colors">Đăng xuất</button>
          </div>
        </div>

        {/* Stats */}
        <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#111]" style={{ boxShadow: 'var(--shadow-card)' }}>
          <div className="flex items-center justify-between px-5 py-3.5" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
            <h2 className="text-[11px] font-medium uppercase tracking-widest text-[#666]">Database Stats</h2>
            <button onClick={fetchStats} disabled={statsLoading}
              className="flex items-center gap-1.5 text-[12px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] disabled:opacity-40 transition-colors">
              <RefreshCw className={`h-3 w-3 ${statsLoading ? 'animate-spin' : ''}`} />Refresh
            </button>
          </div>
          <div className="grid grid-cols-3 gap-px bg-[#eaeaea] dark:bg-[#333]">
            {[
              { label: 'Tổng phrases',   value: stats?.total,             ok: true },
              { label: 'Thiếu phiên âm', value: stats?.null_pronunciation, ok: stats?.null_pronunciation === 0 },
              { label: 'Thiếu examples', value: stats?.null_example1,      ok: stats?.null_example1 === 0 },
            ].map(s => (
              <div key={s.label} className="bg-white dark:bg-[#111] px-4 py-4 text-center">
                {statsLoading || s.value === undefined
                  ? <div className="h-7 w-12 bg-[#eaeaea] dark:bg-[#333] rounded animate-pulse mx-auto" />
                  : <div className={`text-[22px] font-bold tabular-nums tracking-tight ${
                      s.ok ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-amber-500'
                    }`}>{s.value.toLocaleString()}</div>
                }
                <div className="text-[11px] text-[#999] mt-0.5 leading-tight">{s.label}</div>
              </div>
            ))}
          </div>
          {lastRefreshed && <p className="text-[11px] text-[#ccc] dark:text-[#555] text-right px-5 py-2">Cập nhật lúc {lastRefreshed}</p>}
        </div>

        {/* Progress */}
        <ProgressBar progress={progress} active={running} />

        {/* Action selector */}
        <div className="rounded-[8px] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
          {/* Select all header */}
          <button
            onClick={toggleAll}
            className="w-full flex items-center gap-3 px-4 py-3 bg-[#fafafa] dark:bg-[#111] hover:bg-[#f0f0f0] dark:hover:bg-white/5 transition-colors"
            style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}
          >
            <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors
              ${allSelected ? 'bg-[#171717] dark:bg-[#f5f5f5] border-[#171717] dark:border-[#f5f5f5]' : 'border-[#ccc] dark:border-[#444]'}`}>
              {allSelected && <svg className="w-2.5 h-2.5 text-white dark:text-[#171717]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
              {!allSelected && selected.size > 0 && <div className="w-2 h-0.5 bg-[#666] rounded" />}
            </div>
            <span className="text-[11px] font-medium uppercase tracking-widest text-[#666]">Chọn tất cả</span>
            <span className="ml-auto text-[11px] text-[#aaa]">{selected.size}/{ACTIONS.length} đã chọn</span>
          </button>

          {/* Action rows */}
          {ACTIONS.map(({ id, label, desc, icon: Icon, color, bg, ring }) => {
            const isChecked = selected.has(id)
            return (
              <button
                key={id}
                onClick={() => toggleSelect(id)}
                disabled={running}
                className={`w-full flex items-center gap-4 px-4 py-3.5 last:border-0 transition-all text-left
                  ${isChecked ? 'bg-white dark:bg-[#111]' : 'bg-white dark:bg-[#111] hover:bg-[#fafafa] dark:hover:bg-white/3'}
                  disabled:opacity-50 disabled:cursor-not-allowed`}
                style={{ boxShadow: 'rgba(0,0,0,0.04) 0px 1px 0px 0px' }}
              >
                {/* Checkbox */}
                <div className={`w-4 h-4 rounded-[4px] border flex items-center justify-center flex-shrink-0 transition-colors
                  ${isChecked ? `${bg} ${ring} ring-1 border-transparent` : 'border-[#ccc] dark:border-[#444]'}`}>
                  {isChecked && <svg className={`w-2.5 h-2.5 ${color}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>}
                </div>

                {/* Icon */}
                <div className={`p-1.5 rounded-[6px] ${isChecked ? bg : 'bg-[#fafafa] dark:bg-white/5'} transition-colors`}>
                  <Icon className={`h-3.5 w-3.5 ${isChecked ? color : 'text-[#999]'}`} />
                </div>

                {/* Text */}
                <div className="flex-1 min-w-0">
                  <div className={`text-[13px] font-medium transition-colors ${isChecked ? 'text-[#171717] dark:text-[#f5f5f5]' : 'text-[#666] dark:text-[#888]'}`}>{label}</div>
                  <div className="text-[11px] text-[#aaa] dark:text-[#555] mt-0.5 truncate">{desc}</div>
                </div>
              </button>
            )
          })}
        </div>

        {/* Run / Stop button */}
        <button
          onClick={running ? stopAction : runSelected}
          disabled={!running && noneSelected}
          className={`w-full py-3 rounded-[6px] text-[14px] font-semibold transition-all flex items-center justify-center gap-2
            ${running
              ? 'bg-red-500 hover:bg-red-600 text-white'
              : noneSelected
                ? 'bg-[#fafafa] dark:bg-white/5 text-[#ccc] cursor-not-allowed'
                : 'bg-[#171717] dark:bg-white text-white dark:text-[#171717] hover:bg-black dark:hover:bg-[#f5f5f5]'}`}
        >
          {running
            ? <><Square className="h-3.5 w-3.5 fill-current" />Dừng lại</>
            : <><Play className="h-3.5 w-3.5 fill-current" />Chạy {selected.size} tác vụ</>}
        </button>

        {/* Hint: script for large batches */}
        {!running && (
          <p className="text-[11px] text-[#aaa] dark:text-[#555] text-center">
            💡 Để fill 1000+ examples không bị timeout, chạy: <code className="font-mono bg-[#fafafa] dark:bg-white/5 px-1 rounded">npx tsx db/fill-examples.ts</code>
          </p>
        )}

        {/* Log */}
        {log.length > 0 && (
          <div className="rounded-[8px] bg-[#fafafa] dark:bg-[#111]" style={{ boxShadow: 'var(--shadow-card)' }}>
            <div className="flex items-center justify-between px-4 py-3" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
              <h2 className="text-[11px] font-medium uppercase tracking-widest text-[#666]">Activity Log</h2>
              <button onClick={() => setLog([])} className="text-[11px] text-[#aaa] hover:text-[#666] transition-colors">Xóa</button>
            </div>
            <div className="p-4 space-y-1 max-h-48 overflow-y-auto font-mono">
              {log.map((l, i) => <div key={i} className="text-[11px] text-[#666] dark:text-[#888] leading-relaxed">{l}</div>)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
