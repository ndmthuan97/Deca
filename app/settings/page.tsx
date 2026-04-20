'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Volume2, VolumeX, Sun, Moon, Monitor, Clock,
  RotateCcw, Save, Check, Layers, BookOpen, Mic, Bell, BellOff, BellRing
} from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  getSettings, saveSettings, resetSettings,
  DEFAULT_SETTINGS, type UserSettings
} from '@/lib/settings'
import { requestPermission, getPermission, scheduleDailyReminder, clearDailyReminder } from '@/lib/notifications'
import { toast } from 'sonner'

/* ─── Voice picker ────────────────────────────────────────────── */
function useVoices() {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([])
  useEffect(() => {
    function load() {
      const all = window.speechSynthesis.getVoices()
      setVoices(all.filter(v => v.lang.startsWith('en')))
    }
    load()
    window.speechSynthesis.onvoiceschanged = load
  }, [])
  return voices
}

/* ─── Section wrapper ─────────────────────────────────────────── */
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-[8px] bg-white dark:bg-[#1a1a1a] overflow-hidden"
      style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="px-5 py-3 border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
        <h2 className="text-[11px] font-semibold uppercase tracking-widest text-[#999]">{title}</h2>
      </div>
      <div className="divide-y divide-[#f5f5f5] dark:divide-[#222]">
        {children}
      </div>
    </div>
  )
}

/* ─── Row components ──────────────────────────────────────────── */
function Row({ label, desc, children }: { label: string; desc?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-5 py-4">
      <div>
        <p className="text-[14px] font-medium text-[#171717] dark:text-[#f5f5f5]">{label}</p>
        {desc && <p className="text-[12px] text-[#999] mt-0.5">{desc}</p>}
      </div>
      <div className="shrink-0">{children}</div>
    </div>
  )
}

function Toggle({ value, onChange }: { value: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!value)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        value ? 'bg-[#171717] dark:bg-[#f5f5f5]' : 'bg-[#ddd] dark:bg-[#444]'
      )}
      role="switch" aria-checked={value}
    >
      <span className={cn(
        'inline-block h-4 w-4 rounded-full bg-white dark:bg-[#171717] shadow-sm transition-transform',
        value ? 'translate-x-6' : 'translate-x-1'
      )} />
    </button>
  )
}

/* ─── Notification Section ─────────────────────────────────── */
function NotificationSection({
  s,
  update,
}: {
  s: UserSettings
  update: <K extends keyof UserSettings>(k: K, v: UserSettings[K]) => void
}) {
  const [perm, setPerm] = useState<string>('default')

  useEffect(() => { setPerm(getPermission()) }, [])

  async function handleEnable() {
    const result = await requestPermission()
    setPerm(result)
    if (result === 'granted') {
      update('notificationsEnabled', true)
      scheduleDailyReminder(s.notificationHour)
      toast.success('Đã bật thông báo nhắc ôn tập!')
    } else if (result === 'denied') {
      toast.error('Trình duyệt đã chặn thông báo — vào Site Settings để mở lại')
    }
  }

  function handleDisable() {
    update('notificationsEnabled', false)
    clearDailyReminder()
  }

  if (perm === 'unsupported') {
    return (
      <div className="px-5 py-4 text-[13px] text-[#999]">
        Trình duyệt không hỗ trợ Web Notifications.
      </div>
    )
  }

  return (
    <>
      <Row
        label="Nhắc ôn tập mỗi ngày"
        desc={
          perm === 'denied'
            ? 'Trình duyệt đã chặn — vào Site Settings để cho phép'
            : s.notificationsEnabled
              ? `Sẽ thông báo lúc ${String(s.notificationHour).padStart(2,'0')}:00`
              : 'Nhận thông báo nhắc nhở khi đến giờ ôn tập'
        }
      >
        {perm !== 'granted' ? (
          <button
            onClick={handleEnable}
            disabled={perm === 'denied'}
            className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90 disabled:opacity-40 transition-opacity"
          >
            <Bell className="h-3.5 w-3.5" />
            Cho phép
          </button>
        ) : (
          <div className="flex items-center gap-2">
            {s.notificationsEnabled
              ? <BellRing className="h-4 w-4 text-amber-500" />
              : <BellOff  className="h-4 w-4 text-[#bbb]" />
            }
            <button
              onClick={() => s.notificationsEnabled ? handleDisable() : (update('notificationsEnabled', true), scheduleDailyReminder(s.notificationHour))}
              className={cn(
                'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                s.notificationsEnabled ? 'bg-[#171717] dark:bg-[#f5f5f5]' : 'bg-[#ddd] dark:bg-[#444]'
              )}
              role="switch" aria-checked={s.notificationsEnabled}
            >
              <span className={cn(
                'inline-block h-4 w-4 rounded-full bg-white dark:bg-[#171717] shadow-sm transition-transform',
                s.notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
              )} />
            </button>
          </div>
        )}
      </Row>

      {perm === 'granted' && s.notificationsEnabled && (
        <Row label="Giờ nhắc nhở" desc={`Thông báo lúc ${String(s.notificationHour).padStart(2,'0')}:00 hàng ngày`}>
          <div className="flex items-center gap-2">
            <input type="range" min={6} max={23} step={1}
              value={s.notificationHour}
              onChange={e => update('notificationHour', Number(e.target.value))}
              className="w-24 accent-[#171717]"
            />
            <span className="w-10 text-right text-[13px] font-mono font-semibold text-[#171717] dark:text-[#f5f5f5]">
              {String(s.notificationHour).padStart(2,'0')}:00
            </span>
          </div>
        </Row>
      )}
    </>
  )
}

/* ─── Main Settings Page ──────────────────────────────────────── */
export default function SettingsPage() {
  const router = useRouter()
  const voices = useVoices()
  const [s, setS] = useState<UserSettings>(DEFAULT_SETTINGS)
  const [saved, setSaved] = useState(false)

  useEffect(() => { setS(getSettings()) }, [])

  function update<K extends keyof UserSettings>(key: K, value: UserSettings[K]) {
    setS(prev => ({ ...prev, [key]: value }))
    setSaved(false)
  }

  function handleSave() {
    saveSettings(s)
    // Apply theme
    const root = document.documentElement
    if (s.theme === 'dark') root.classList.add('dark')
    else if (s.theme === 'light') root.classList.remove('dark')
    else {
      const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
      root.classList.toggle('dark', prefersDark)
    }
    setSaved(true)
    toast.success('Đã lưu cài đặt')
    setTimeout(() => setSaved(false), 2000)
  }

  function handleReset() {
    if (!confirm('Đặt lại tất cả cài đặt về mặc định?')) return
    const defaults = resetSettings()
    setS(defaults)
    toast.success('Đã đặt lại cài đặt')
  }

  function previewVoice(uri: string) {
    const v = voices.find(v => v.voiceURI === uri)
    if (!v) return
    window.speechSynthesis.cancel()
    const u = new SpeechSynthesisUtterance('Hello, this is a preview.')
    u.voice = v
    u.rate = s.ttsRate
    window.speechSynthesis.speak(u)
  }

  const THEMES: Array<{ value: UserSettings['theme']; label: string; icon: React.ReactNode }> = [
    { value: 'light',  label: 'Sáng',    icon: <Sun  className="h-4 w-4" /> },
    { value: 'dark',   label: 'Tối',     icon: <Moon className="h-4 w-4" /> },
    { value: 'system', label: 'Hệ thống', icon: <Monitor className="h-4 w-4" /> },
    { value: 'auto',   label: 'Tự động', icon: <Clock className="h-4 w-4" /> },
  ]

  return (
    <div className="min-h-screen bg-[#fafafa] dark:bg-[#0a0a0a]">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white dark:bg-[#0a0a0a]"
        style={{ boxShadow: 'rgba(0,0,0,0.06) 0px 1px 0px 0px' }}>
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center justify-between">
          <button onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors">
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>
          <h1 className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Cài đặt</h1>
          <button onClick={handleSave}
            className={cn(
              'flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[13px] font-medium transition-all',
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90'
            )}>
            {saved ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />}
            {saved ? 'Đã lưu' : 'Lưu'}
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-4">

        {/* ── Giao diện ── */}
        <Section title="Giao diện">
          <Row label="Chủ đề" desc="Màu nền của ứng dụng">
            <div className="flex gap-1.5 flex-wrap">
              {THEMES.map(t => (
                <button key={t.value} onClick={() => update('theme', t.value)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-medium transition-all',
                    s.theme === t.value
                      ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                      : 'text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5]'
                  )}
                  style={s.theme !== t.value ? { boxShadow: 'var(--shadow-border)' } : {}}>
                  {t.icon} {t.label}
                </button>
              ))}
            </div>
          </Row>
          {s.theme === 'auto' && (
            <>
              <Row label="Bắt đầu tối" desc="Giờ bật Dark mode">
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={23} step={1}
                    value={s.autoThemeDarkFrom}
                    onChange={e => update('autoThemeDarkFrom', Number(e.target.value))}
                    className="w-24 accent-[#171717]"
                  />
                  <span className="w-10 text-right text-[13px] font-mono font-semibold text-[#171717] dark:text-[#f5f5f5]">
                    {String(s.autoThemeDarkFrom).padStart(2,'0')}:00
                  </span>
                </div>
              </Row>
              <Row label="Kết thúc tối" desc="Giờ tắt Dark mode (sang sáng)">
                <div className="flex items-center gap-2">
                  <input type="range" min={0} max={23} step={1}
                    value={s.autoThemeDarkTo}
                    onChange={e => update('autoThemeDarkTo', Number(e.target.value))}
                    className="w-24 accent-[#171717]"
                  />
                  <span className="w-10 text-right text-[13px] font-mono font-semibold text-[#171717] dark:text-[#f5f5f5]">
                    {String(s.autoThemeDarkTo).padStart(2,'0')}:00
                  </span>
                </div>
              </Row>
            </>
          )}
        </Section>

        {/* ── Ôn tập ── */}
        <Section title="Ôn tập (SRS)">
          <Row label="Số câu mỗi phiên" desc={`Hiện tại: ${s.reviewLimit} câu`}>
            <div className="flex items-center gap-2">
              <input
                type="range" min={5} max={50} step={5}
                value={s.reviewLimit}
                onChange={e => update('reviewLimit', Number(e.target.value))}
                className="w-24 accent-[#171717]"
              />
              <span className="w-8 text-right text-[13px] font-mono font-semibold text-[#171717] dark:text-[#f5f5f5]">
                {s.reviewLimit}
              </span>
            </div>
          </Row>
        </Section>

        {/* ── Learn Mode ── */}
        <Section title="Learn Mode">
          <Row label="Số câu mỗi phiên Learn" desc={`Hiện tại: ${s.learnBatchSize} câu × 4 giai đoạn`}>
            <div className="flex items-center gap-2">
              <input
                type="range" min={5} max={20} step={5}
                value={s.learnBatchSize}
                onChange={e => update('learnBatchSize', Number(e.target.value))}
                className="w-24 accent-[#171717]"
              />
              <span className="w-8 text-right text-[13px] font-mono font-semibold text-[#171717] dark:text-[#f5f5f5]">
                {s.learnBatchSize}
              </span>
            </div>
          </Row>
        </Section>

        {/* ── TTS ── */}
        <Section title="Phát âm (TTS)">
          <Row label="Bật phát âm" desc="Tự động đọc câu khi ôn tập">
            <Toggle value={s.ttsEnabled} onChange={v => update('ttsEnabled', v)} />
          </Row>

          {s.ttsEnabled && (
            <>
              <Row label="Tốc độ đọc" desc={`${s.ttsRate.toFixed(1)}× (1.0 = bình thường)`}>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-[#999]">0.5</span>
                  <input
                    type="range" min={0.5} max={1.5} step={0.1}
                    value={s.ttsRate}
                    onChange={e => update('ttsRate', Number(e.target.value))}
                    className="w-24 accent-[#171717]"
                  />
                  <span className="text-[11px] text-[#999]">1.5×</span>
                </div>
              </Row>

              {voices.length > 0 && (
                <Row label="Giọng đọc" desc="Chọn giọng tiếng Anh phù hợp">
                  <div className="flex items-center gap-2">
                    <select
                      value={s.ttsVoiceURI}
                      onChange={e => { update('ttsVoiceURI', e.target.value); previewVoice(e.target.value) }}
                      className="rounded-[6px] border border-[#e0e0e0] dark:border-[#333] bg-white dark:bg-[#222] px-2 py-1 text-[12px] text-[#171717] dark:text-[#f5f5f5] outline-none max-w-[200px]"
                    >
                      <option value="">Mặc định</option>
                      {voices.map(v => (
                        <option key={v.voiceURI} value={v.voiceURI}>
                          {v.name} ({v.lang})
                        </option>
                      ))}
                    </select>
                  </div>
                </Row>
              )}
            </>
          )}
        </Section>

        {/* ── Thông báo ── */}
        <Section title="Thông báo">
          <NotificationSection s={s} update={update} />
        </Section>

        {/* ── Reset ── */}
        <Section title="Nâng cao">
          <Row label="Đặt lại cài đặt" desc="Khôi phục tất cả về mặc định ban đầu">
            <button onClick={handleReset}
              className="flex items-center gap-1.5 rounded-[6px] px-3 py-1.5 text-[12px] font-medium text-red-600 hover:text-red-700 transition-colors"
              style={{ boxShadow: 'var(--shadow-border)' }}>
              <RotateCcw className="h-3.5 w-3.5" /> Đặt lại
            </button>
          </Row>
        </Section>

        {/* Version */}
        <p className="text-center text-[11px] text-[#ccc] pb-4">Dace v0.1 · Built with ❤️</p>
      </main>
    </div>
  )
}
