'use client'

import { useState, useEffect } from 'react'
import { X, ExternalLink, Loader2, Plus, AlertTriangle, Link2, ClipboardPaste } from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'

interface DDImportModalProps {
  open: boolean
  onClose: () => void
  onImported?: () => void
}

interface DDResult {
  sentence: string | null
  hint: string | null
  title: string | null
  source_url: string
}

interface Topic { id: number; name: string; icon?: string }

type Mode = 'url' | 'manual'

export function DDImportModal({ open, onClose, onImported }: DDImportModalProps) {
  const [mode,     setMode]     = useState<Mode>('url')
  const [url,      setUrl]      = useState('')
  const [loading,  setLoading]  = useState(false)
  const [result,   setResult]   = useState<DDResult | null>(null)
  const [sentence, setSentence] = useState('')
  const [topicId,  setTopicId]  = useState('')
  const [topics,   setTopics]   = useState<Topic[]>([])
  const [saving,   setSaving]   = useState(false)
  const [error,    setError]    = useState('')

  useEffect(() => {
    if (open) apiFetch<Topic[]>('/api/topics').then(d => setTopics(Array.isArray(d) ? d : [])).catch(() => {})
  }, [open])

  function reset() { setUrl(''); setResult(null); setSentence(''); setError('') }
  function switchMode(m: Mode) { reset(); setMode(m) }

  async function handleFetch() {
    if (!url.trim()) return
    setLoading(true); setError(''); setResult(null); setSentence('')
    try {
      const data = await apiFetch<DDResult>('/api/import/daily-dictation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }),
      })
      setResult(data)
      setSentence(data.sentence ?? '')
    } catch {
      setError('Không thể fetch trang. Thử paste câu thủ công.')
    } finally {
      setLoading(false)
    }
  }

  async function handleSave() {
    if (!sentence.trim() || !topicId) return
    setSaving(true)
    try {
      await apiFetch('/api/phrases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: parseInt(topicId), sample_sentence: sentence.trim() }),
      })
      onImported?.()
      reset()
      onClose()
    } catch {
      setError('Lưu thất bại — thử lại')
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  const canSave = sentence.trim().length > 0 && topicId !== ''

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white dark:bg-[#141414]"
        style={{ boxShadow: 'rgba(0,0,0,0.2) 0px 8px 40px, rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#2a2a2a]">
          <div>
            <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5]">🎧 Import câu luyện tập</h2>
            <p className="text-[11px] text-[#999]">Từ Daily Dictation hoặc nhập tay</p>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#666] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Mode tabs */}
        <div className="flex gap-2 px-5 pt-4">
          {([
            { key: 'url',    icon: Link2,          label: 'Daily Dictation URL' },
            { key: 'manual', icon: ClipboardPaste, label: 'Nhập / Paste tay' },
          ] as const).map(({ key, icon: Icon, label }) => (
            <button
              key={key}
              onClick={() => switchMode(key)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-[8px] py-2 text-[12px] font-medium transition-colors',
                mode === key
                  ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                  : 'bg-[#f5f5f5] dark:bg-[#1e1e1e] text-[#666] dark:text-[#aaa] hover:bg-[#ebebeb] dark:hover:bg-[#252525]'
              )}
            >
              <Icon className="h-3.5 w-3.5" />{label}
            </button>
          ))}
        </div>

        <div className="p-5 space-y-3.5">
          {/* ── URL mode ── */}
          {mode === 'url' && (
            <>
              <div>
                <label className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-1.5 block">
                  Link bài tập
                </label>
                <div className="flex gap-2">
                  <input
                    value={url}
                    onChange={e => setUrl(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleFetch()}
                    placeholder="https://dailydictation.com/exercises/123"
                    className="flex-1 rounded-[6px] border border-[#e8e8e8] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-[13px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#bbb] outline-none focus:border-[#999] dark:focus:border-[#555] transition-colors"
                  />
                  <button
                    onClick={handleFetch}
                    disabled={loading || !url.trim()}
                    className="flex items-center gap-1.5 rounded-[6px] px-3 py-2 text-[12px] font-medium bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-85 disabled:opacity-40 transition-opacity shrink-0"
                  >
                    {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ExternalLink className="h-3.5 w-3.5" />}
                    Fetch
                  </button>
                </div>
              </div>

              {error && (
                <div className="flex items-start gap-2 rounded-[6px] bg-red-50 dark:bg-red-900/20 px-3 py-2.5">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}

              {result !== null && (
                <div>
                  <label className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-1.5 block">
                    Câu đã trích {result.hint && <span className="normal-case text-amber-500">— {result.hint}</span>}
                  </label>
                  <textarea
                    value={sentence}
                    onChange={e => setSentence(e.target.value)}
                    rows={3}
                    className="w-full rounded-[6px] border border-[#e8e8e8] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-[13px] text-[#171717] dark:text-[#f5f5f5] outline-none focus:border-[#999] dark:focus:border-[#555] transition-colors resize-none"
                  />
                  {result.source_url && (
                    <a href={result.source_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-[11px] text-[#999] hover:text-[#555] mt-1 transition-colors w-fit">
                      <ExternalLink className="h-3 w-3" /> Xem bài gốc
                    </a>
                  )}
                </div>
              )}
            </>
          )}

          {/* ── Manual mode ── */}
          {mode === 'manual' && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-1.5 block">
                Câu / đoạn văn
              </label>
              <textarea
                autoFocus
                value={sentence}
                onChange={e => setSentence(e.target.value)}
                placeholder={'Paste hoặc gõ câu bất kỳ...\n\nVD: The manager asked the team to implement the new policy.'}
                rows={4}
                className="w-full rounded-[6px] border border-[#e8e8e8] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 py-2.5 text-[13px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#bbb] outline-none focus:border-[#999] dark:focus:border-[#555] transition-colors resize-none leading-relaxed"
              />
              {error && (
                <div className="flex items-start gap-2 rounded-[6px] bg-red-50 dark:bg-red-900/20 px-3 py-2.5 mt-3">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500 shrink-0 mt-0.5" />
                  <p className="text-[12px] text-red-600 dark:text-red-400">{error}</p>
                </div>
              )}
            </div>
          )}

          {/* Topic selector — always visible */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-1.5 block">
              Thêm vào topic
            </label>
            <select
              value={topicId}
              onChange={e => setTopicId(e.target.value)}
              className="w-full rounded-[6px] border border-[#e8e8e8] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 py-2 text-[13px] text-[#171717] dark:text-[#f5f5f5] outline-none focus:border-[#999] dark:focus:border-[#555] transition-colors"
            >
              <option value="">— Chọn topic —</option>
              {topics.map(t => (
                <option key={t.id} value={String(t.id)}>{t.icon} {t.name}</option>
              ))}
            </select>
          </div>

          {/* Save */}
          <button
            onClick={handleSave}
            disabled={saving || !canSave}
            className="w-full flex items-center justify-center gap-2 rounded-[8px] py-2.5 text-[13px] font-semibold bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-85 disabled:opacity-40 transition-opacity"
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
            Thêm vào topic
          </button>
        </div>

        <div className="px-5 pb-4 -mt-1">
          <p className="text-[11px] text-[#ccc]">
            💡 Sau khi thêm, dùng AI Auto-fill để điền nghĩa, IPA và ví dụ tự động
          </p>
        </div>
      </div>
    </>
  )
}
