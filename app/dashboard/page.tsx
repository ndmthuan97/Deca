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

/* ─── Stat Card ─────────────────────────────────────────────── */
function StatCard({ icon, label, value, sub, color }: {
  icon: React.ReactNode; label: string; value: string | number
  sub?: string; color: string
}) {
  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 flex items-start gap-4 shadow-sm">
      <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-xl', color)}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
        <p className="text-sm font-medium text-gray-600 dark:text-gray-400">{label}</p>
        {sub && <p className="text-xs text-gray-400 dark:text-gray-500 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

/* ─── Activity Heatmap (30 ngày) ────────────────────────────── */
function ActivityHeatmap({ activity }: { activity: { date: string; count: number }[] }) {
  // Build 30 ngày liên tiếp
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
    if (count === 0) return 'bg-gray-100 dark:bg-gray-800'
    const pct = count / max
    if (pct < 0.25) return 'bg-orange-200 dark:bg-orange-900/60'
    if (pct < 0.5)  return 'bg-orange-300 dark:bg-orange-700'
    if (pct < 0.75) return 'bg-orange-400 dark:bg-orange-600'
    return 'bg-orange-500 dark:bg-orange-500'
  }

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Hoạt động 30 ngày qua</p>
      <div className="flex flex-wrap gap-1">
        {days.map(d => (
          <div
            key={d.date}
            title={`${d.date}: ${d.count} lượt ôn`}
            className={cn('h-6 w-6 rounded-md transition-colors', intensity(d.count))}
          />
        ))}
      </div>
      <div className="flex items-center gap-1.5 mt-3 text-xs text-gray-400">
        <span>Ít</span>
        {['bg-gray-100 dark:bg-gray-800','bg-orange-200','bg-orange-300','bg-orange-400','bg-orange-500'].map((c, i) => (
          <div key={i} className={cn('h-3.5 w-3.5 rounded-sm', c)} />
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
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Kết quả 7 ngày qua</p>
      {total === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu ôn tập</p>
      ) : (
        <>
          {/* Stacked bar */}
          <div className="flex rounded-full overflow-hidden h-4 mb-3">
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
                <div className={cn('h-2.5 w-2.5 rounded-full shrink-0', e.color)} />
                <span className="text-xs text-gray-500 dark:text-gray-400">{e.label}</span>
                <span className="ml-auto text-xs font-semibold text-gray-700 dark:text-gray-300">{e.value}</span>
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
  const colors = ['bg-orange-400','bg-violet-400','bg-sky-400','bg-emerald-400','bg-amber-400','bg-pink-400']

  return (
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-4">Phân bố loại câu</p>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Chưa có dữ liệu</p>
      ) : (
        <div className="space-y-2.5">
          {data.slice(0, 6).map((t, i) => (
            <div key={t.type}>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-600 dark:text-gray-400 truncate max-w-[60%]">{t.type}</span>
                <span className="text-xs font-semibold text-gray-700 dark:text-gray-300">
                  {t.count} <span className="text-gray-400 font-normal">({Math.round((t.count / total) * 100)}%)</span>
                </span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
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
    <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle className="h-4 w-4 text-red-400" />
        <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Câu hay quên nhất</p>
      </div>
      {data.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">Tuyệt vời — chưa có câu nào bị quên!</p>
      ) : (
        <div className="space-y-3">
          {data.map((h, i) => (
            <div key={h.phraseId} className="flex gap-3 items-start">
              <span className={cn(
                'shrink-0 flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold text-white',
                i === 0 ? 'bg-red-500' : i === 1 ? 'bg-orange-500' : 'bg-amber-400'
              )}>{i + 1}</span>
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 dark:text-gray-200 truncate">{h.sampleSentence}</p>
                {h.translation && <p className="text-xs text-gray-400 truncate">{h.translation}</p>}
              </div>
              <span className="shrink-0 text-xs font-semibold text-red-500 ml-auto">×{h.againCount}</span>
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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-orange-50/30 dark:from-slate-950 dark:to-orange-950/10">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 dark:bg-slate-950/80 backdrop-blur border-b border-gray-100 dark:border-gray-800">
        <div className="mx-auto max-w-3xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 dark:hover:text-gray-200">
            <ArrowLeft className="h-4 w-4" /> Quay lại
          </button>
          <h1 className="text-sm font-bold text-gray-900 dark:text-white">Dashboard học tập</h1>
          <div />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8 space-y-6">
        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-orange-500" />
          </div>
        ) : !stats ? (
          <p className="text-center text-gray-400 py-20">Không thể tải dữ liệu</p>
        ) : (
          <>
            {/* Summary cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <StatCard icon={<BookOpen className="h-5 w-5 text-orange-500" />}
                label="Tổng câu" value={stats.summary.totalPhrases}
                sub={`${stats.summary.totalTopics} chủ đề`}
                color="bg-orange-50 dark:bg-orange-900/20" />
              <StatCard icon={<CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                label="Đã thuộc" value={`${learnedPct}%`}
                sub={`${stats.summary.learnedPhrases} câu`}
                color="bg-emerald-50 dark:bg-emerald-900/20" />
              <StatCard icon={<Target className="h-5 w-5 text-violet-500" />}
                label="Cần ôn hôm nay" value={stats.summary.dueToday}
                sub="due for review"
                color="bg-violet-50 dark:bg-violet-900/20" />
              <StatCard icon={<Flame className="h-5 w-5 text-orange-500" />}
                label="Streak" value={streak > 0 ? `🔥 ${streak}` : '—'}
                sub={streak > 0 ? 'ngày liên tiếp' : 'Bắt đầu hôm nay!'}
                color="bg-amber-50 dark:bg-amber-900/20" />
            </div>

            {/* Progress bar — đã thuộc */}
            <div className="rounded-2xl border border-gray-100 dark:border-gray-800 bg-white dark:bg-gray-900 p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">Tiến độ học</p>
                <span className="text-sm font-bold text-orange-500">{learnedPct}%</span>
              </div>
              <div className="h-3 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-1000"
                  style={{ width: `${learnedPct}%` }}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">
                {stats.summary.learnedPhrases} / {stats.summary.totalPhrases} câu thuộc (≥ 3 lần ôn đúng)
              </p>
            </div>

            {/* Activity Heatmap */}
            <ActivityHeatmap activity={stats.activity} />

            {/* Result + Type Dist */}
            <div className="grid sm:grid-cols-2 gap-4">
              <ResultBreakdown data={stats.resultBreakdown as DashboardStats['resultBreakdown']} />
              <TypeDist data={stats.typeDist} />
            </div>

            {/* Hardest phrases */}
            <HardestPhrases data={stats.hardestPhrases} />

            {/* CTA */}
            <div className="grid sm:grid-cols-2 gap-3">
              <Link href="/review"
                className="flex items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 px-6 py-4 text-sm font-semibold text-white hover:from-orange-400 hover:to-amber-400 transition-all shadow-md shadow-orange-200/50 dark:shadow-orange-900/30">
                <GraduationCap className="h-5 w-5" />
                Ôn tập ngay ({stats.summary.dueToday} câu)
              </Link>
              <Link href="/"
                className="flex items-center justify-center gap-2 rounded-2xl border-2 border-orange-200 dark:border-orange-800 px-6 py-4 text-sm font-semibold text-orange-600 dark:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20 transition-all">
                <BookOpen className="h-5 w-5" />
                Xem tất cả chủ đề
              </Link>
            </div>
          </>
        )}
      </main>
    </div>
  )
}
