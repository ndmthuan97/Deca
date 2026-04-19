'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  Flame, BookOpen, Brain, GraduationCap, ArrowLeft,
  TrendingUp, BarChart2, Target, Loader2, AlertTriangle,
  CheckCircle2
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { getStreak } from '@/lib/streak'

/* ─── Types ──────────────────────────────────────────────────── */
interface DashboardStats {
  summary: {
    totalPhrases:   number
    totalTopics:    number
    learnedPhrases: number
    dueToday:       number
    reviewedWeek:   number
  }
  activity: { date: string; count: number }[]
  resultBreakdown: { again: number; hard: number; good: number; easy: number }
  hardestPhrases: { phraseId: number; againCount: number; sampleSentence: string; translation: string | null }[]
  typeDist: { type: string; count: number }[]
}

/* ─── Stat Card — Vercel style ───────────────────────────────── */
function StatCard({ icon, label, value, sub }: {
  icon: React.ReactNode; label: string; value: string | number; sub?: string
}) {
  return (
    <div className="rounded-[8px] bg-white dark:bg-[#111] px-5 py-4 flex flex-col gap-1"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">{label}</span>
        <span className="text-[#999] dark:text-[#555]">{icon}</span>
      </div>
      <p className="text-[28px] font-bold tabular-nums tracking-tight text-[#171717] dark:text-[#f5f5f5] leading-none">{value}</p>
      {sub && <p className="text-[12px] text-[#999] dark:text-[#555] mt-0.5">{sub}</p>}
    </div>
  )
}

/* ─── Activity Heatmap (30 ngày) ────────────────────────────── */
function ActivityHeatmap({ activity }: { activity: { date: string; count: number }[] }) {
  const days: { date: string; count: number }[] = []
  for (let i = 29; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const dateStr = d.toISOString().slice(0, 10)
    const found = activity.find(a => a.date === dateStr)
    days.push({ date: dateStr, count: found?.count ?? 0 })
  }
  const max = Math.max(...days.map(d => d.count), 1)

  function intensity(count: number) {
    if (count === 0) return 'bg-[#f0f0f0] dark:bg-[#222]'
    const pct = count / max
    if (pct < 0.25) return 'bg-orange-200 dark:bg-orange-900/60'
    if (pct < 0.5)  return 'bg-orange-300 dark:bg-orange-700'
    if (pct < 0.75) return 'bg-orange-400 dark:bg-orange-600'
    return 'bg-orange-500 dark:bg-orange-500'
  }

  return (
    <div className="rounded-[8px] bg-white dark:bg-[#111] p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] mb-4">
        Hoạt động 30 ngày qua
      </p>
      <div className="flex flex-wrap gap-1">
        {days.map(d => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} lượt ôn`}
            className={cn('h-6 w-6 rounded-[4px] transition-colors', intensity(d.count))}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-[11px] text-[#999]">
        <span>Ít</span>
        {['bg-[#f0f0f0]','bg-orange-200','bg-orange-300','bg-orange-400','bg-orange-500'].map((c, i) => (
          <div key={i} className={cn('h-3.5 w-3.5 rounded-[3px]', c)} />
        ))}
        <span>Nhiều</span>
      </div>
    </div>
  )
}

/* ─── Result Breakdown Bar ───────────────────────────────────── */
function ResultBreakdown({ data }: { data: DashboardStats['resultBreakdown'] }) {
  const entries: { key: string; label: string; color: string; value: number }[] = [
    { key: 'easy',  label: 'Dễ',   color: 'bg-sky-400',     value: data.easy },
    { key: 'good',  label: 'Ổn',   color: 'bg-emerald-400', value: data.good },
    { key: 'hard',  label: 'Khó',  color: 'bg-orange-400',  value: data.hard },
    { key: 'again', label: 'Quên', color: 'bg-red-400',     value: data.again },
  ]
  const total = entries.reduce((s, e) => s + e.value, 0)

  return (
    <div className="rounded-[8px] bg-white dark:bg-[#111] p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] mb-4">
        Kết quả 7 ngày qua
      </p>
      {total === 0 ? (
        <p className="text-[13px] text-[#999] text-center py-4">Chưa có dữ liệu ôn tập</p>
      ) : (
        <>
          <div className="flex rounded-full overflow-hidden h-2.5 mb-4">
            {entries.filter(e => e.value > 0).map(e => (
              <div
                key={e.key}
                className={cn('transition-all', e.color)}
                style={{ width: `${(e.value / total) * 100}%` }}
                title={`${e.label}: ${e.value}`}
              />
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {entries.map(e => (
              <div key={e.key} className="flex items-center gap-2">
                <div className={cn('h-2 w-2 rounded-full shrink-0', e.color)} />
                <span className="text-[12px] text-[#666] dark:text-[#888]">{e.label}</span>
                <span className="ml-auto text-[12px] font-semibold text-[#171717] dark:text-[#f5f5f5] tabular-nums">{e.value}</span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

/* ─── Type Distribution ──────────────────────────────────────── */
function TypeDist({ data }: { data: DashboardStats['typeDist'] }) {
  const total = data.reduce((s, t) => s + t.count, 0)
  const colors = ['bg-[#171717] dark:bg-[#f5f5f5]','bg-[#555]','bg-[#888]','bg-[#aaa]','bg-[#ccc]','bg-[#e0e0e0]']

  return (
    <div className="rounded-[8px] bg-white dark:bg-[#111] p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] mb-4">
        Phân bố loại câu
      </p>
      {data.length === 0 ? (
        <p className="text-[13px] text-[#999] text-center py-4">Chưa có dữ liệu</p>
      ) : (
        <div className="space-y-3">
          {data.slice(0, 6).map((t, i) => (
            <div key={t.type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-[12px] text-[#666] dark:text-[#888] truncate max-w-[60%]">{t.type}</span>
                <span className="text-[12px] font-semibold text-[#171717] dark:text-[#f5f5f5] tabular-nums">
                  {t.count} <span className="text-[#aaa] font-normal">({Math.round((t.count / total) * 100)}%)</span>
                </span>
              </div>
              <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-[#222] overflow-hidden">
                <div
                  className={cn('h-full rounded-full transition-all duration-700', colors[i % colors.length])}
                  style={{ width: `${(t.count / total) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Hardest Phrases ────────────────────────────────────────── */
function HardestPhrases({ data }: { data: DashboardStats['hardestPhrases'] }) {
  return (
    <div className="rounded-[8px] bg-white dark:bg-[#111] p-5"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-center gap-2 mb-4" style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <AlertTriangle className="h-3.5 w-3.5 text-[#666]" />
        <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888] pb-3">
          Câu hay quên nhất
        </p>
      </div>
      {data.length === 0 ? (
        <p className="text-[13px] text-[#999] text-center py-4">Tuyệt vời — chưa có câu nào bị quên!</p>
      ) : (
        <div className="space-y-3">
          {data.map((h, i) => (
            <div key={h.phraseId} className="flex gap-3 items-start">
              <span className="shrink-0 flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white bg-[#171717] dark:bg-[#f5f5f5] dark:text-[#171717]">
                {i + 1}
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[13px] font-medium text-[#171717] dark:text-[#f5f5f5] truncate">{h.sampleSentence}</p>
                {h.translation && <p className="text-[11px] text-[#999] truncate">{h.translation}</p>}
              </div>
              <span className="shrink-0 text-[11px] font-semibold text-red-500 ml-auto tabular-nums">×{h.againCount}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

/* ─── Main Dashboard Page ────────────────────────────────────── */
export default function DashboardPage() {
  const router = useRouter()
  const [stats, setStats]     = useState<DashboardStats | null>(null)
  const [loading, setLoading] = useState(true)
  const [streak, setStreak]   = useState(0)

  useEffect(() => {
    apiFetch<DashboardStats>('/api/dashboard/stats')
      .then(setStats)
      .catch(() => {})
      .finally(() => setLoading(false))
    setStreak(getStreak().count)
  }, [])

  const learnedPct = stats
    ? Math.round((stats.summary.learnedPhrases / Math.max(stats.summary.totalPhrases, 1)) * 100)
    : 0

  return (
    <div className="min-h-screen bg-white dark:bg-[#0a0a0a]">

      {/* ── Header — Vercel nav bottom shadow-border ── */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" />
            Quay lại
          </button>
          <h1 className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] tracking-tight">
            Dashboard học tập
          </h1>
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-4">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
          </div>
        ) : !stats ? (
          <p className="text-center text-[#999] py-20 text-[13px]">Không thể tải dữ liệu</p>
        ) : (
          <>
            {/* ── Stat cards ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard
                icon={<BookOpen className="h-4 w-4" />}
                label="Tổng câu"
                value={stats.summary.totalPhrases}
                sub={`${stats.summary.totalTopics} chủ đề`}
              />
              <StatCard
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Đã thuộc"
                value={`${learnedPct}%`}
                sub={`${stats.summary.learnedPhrases} câu`}
              />
              <StatCard
                icon={<Target className="h-4 w-4" />}
                label="Ôn hôm nay"
                value={stats.summary.dueToday}
                sub="due for review"
              />
              <StatCard
                icon={<Flame className="h-4 w-4 text-orange-500" />}
                label="Streak"
                value={streak > 0 ? `🔥 ${streak}` : '—'}
                sub={streak > 0 ? 'ngày liên tiếp' : 'Bắt đầu hôm nay!'}
              />
            </div>

            {/* ── Progress bar ── */}
            <div className="rounded-[8px] bg-white dark:bg-[#111] p-5"
              style={{ boxShadow: 'var(--shadow-card)' }}>
              <div className="flex items-center justify-between mb-3">
                <p className="text-[11px] font-medium uppercase tracking-widest text-[#666] dark:text-[#888]">
                  Tiến độ học
                </p>
                <span className="text-[13px] font-bold text-[#171717] dark:text-[#f5f5f5] tabular-nums">{learnedPct}%</span>
              </div>
              <div className="h-1.5 rounded-full bg-[#f0f0f0] dark:bg-[#222] overflow-hidden">
                <div
                  className="h-full rounded-full bg-[#171717] dark:bg-[#f5f5f5] transition-all duration-1000"
                  style={{ width: `${learnedPct}%` }}
                />
              </div>
              <p className="text-[11px] text-[#999] mt-2 tabular-nums">
                {stats.summary.learnedPhrases} / {stats.summary.totalPhrases} câu thuộc (≥ 3 lần ôn đúng)
              </p>
            </div>

            {/* ── Activity Heatmap ── */}
            <ActivityHeatmap activity={stats.activity} />

            {/* ── Result + Type Dist ── */}
            <div className="grid sm:grid-cols-2 gap-3">
              <ResultBreakdown data={stats.resultBreakdown as DashboardStats['resultBreakdown']} />
              <TypeDist data={stats.typeDist} />
            </div>

            {/* ── Hardest phrases ── */}
            <HardestPhrases data={stats.hardestPhrases} />

            {/* ── CTA ── */}
            <div className="grid sm:grid-cols-2 gap-3">
              <Link href="/review"
                className="flex items-center justify-center gap-2 rounded-[6px] bg-[#171717] dark:bg-[#f5f5f5] px-6 py-3.5 text-[14px] font-medium text-white dark:text-[#171717] hover:opacity-90 transition-opacity">
                <GraduationCap className="h-4 w-4" />
                Ôn tập ngay ({stats.summary.dueToday} câu)
              </Link>
              <Link href="/"
                className="flex items-center justify-center gap-2 rounded-[6px] px-6 py-3.5 text-[14px] font-medium text-[#171717] dark:text-[#f5f5f5] transition-colors"
                style={{ boxShadow: 'var(--shadow-border)' }}>
                <BookOpen className="h-4 w-4" />
                Xem tất cả chủ đề
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
