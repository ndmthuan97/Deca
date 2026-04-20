'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  Plus, Mail, Trash2, Zap, CheckCircle2, ArrowLeft,
  BookOpen, Clock, FileText, X, Loader2, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import {
  getEmails, addEmail, deleteEmail, markExtracted, updateTitle,
  type PracticeEmail,
} from '@/lib/practice-emails'
import { apiFetch } from '@/lib/api-client'

/* ─── Format helpers ─────────────────────────────────────── */
function fmtDate(iso: string) {
  const d = new Date(iso)
  return d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' })
}
function fmtRelative(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const h = Math.floor(diff / 3_600_000)
  if (h < 1) return 'Vừa xong'
  if (h < 24) return `${h} giờ trước`
  const d = Math.floor(h / 24)
  return `${d} ngày trước`
}

/* ─── Add modal ──────────────────────────────────────────── */
interface AddModalProps {
  onClose: () => void
  onAdded: (e: PracticeEmail) => void
}

function AddModal({ onClose, onAdded }: AddModalProps) {
  const [content, setContent]   = useState('')
  const [title,   setTitle]     = useState('')
  const [topicId, setTopicId]   = useState('')
  const [topics,  setTopics]    = useState<{ id: number; name: string }[]>([])
  const textRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    apiFetch<{ data?: { id: number; name: string }[]; id?: number; name?: string }[]>('/api/topics')
      .then(d => setTopics(Array.isArray(d) ? (d as { id: number; name: string }[]) : []))
      .catch(() => {})
    setTimeout(() => textRef.current?.focus(), 60)
  }, [])

  // Auto-generate title from first line of email
  useEffect(() => {
    if (!title && content.trim()) {
      const firstLine = content.trim().split('\n')[0].replace(/^(subject:|re:|fw:|fwd:)/i, '').trim()
      if (firstLine.length > 6 && firstLine.length < 80) setTitle(firstLine)
    }
  }, [content]) // eslint-disable-line react-hooks/exhaustive-deps

  function handleSave() {
    if (!content.trim()) { toast.error('Chưa có nội dung email'); return }
    const selectedTopic = topics.find(t => String(t.id) === topicId)
    const email = addEmail({
      title:      title.trim() || `Email ${fmtDate(new Date().toISOString())}`,
      content:    content.trim(),
      source:     'notebooklm',
      topic_id:   selectedTopic?.id,
      topic_name: selectedTopic?.name,
      extracted:  false,
    })
    onAdded(email)
    onClose()
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white dark:bg-[#141414] flex flex-col max-h-[90vh]"
        style={{ boxShadow: 'rgba(0,0,0,0.2) 0px 8px 40px, rgba(0,0,0,0.08) 0px 0px 0px 1px' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#2a2a2a] shrink-0">
          <div className="flex items-center gap-2">
            <Mail className="h-4 w-4 text-[#666]" />
            <h2 className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5]">Thêm email luyện tập</h2>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#666] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Content */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-1.5 block">
              Nội dung email (paste từ NotebookLM)
            </label>
            <textarea
              ref={textRef}
              value={content}
              onChange={e => setContent(e.target.value)}
              placeholder={"Subject: Q3 Budget Review\n\nDear team,\n\nI'd like to implement (thực hiện) a new strategy..."}
              rows={8}
              className="w-full rounded-[8px] border border-[#e8e8e8] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-4 py-3 text-[13px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#ccc] outline-none focus:border-[#999] dark:focus:border-[#555] transition-colors resize-none font-mono leading-relaxed"
            />
            {content.trim() && (
              <p className="text-[11px] text-[#bbb] mt-1">
                {content.trim().split(/\s+/).length} từ
              </p>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-1.5 block">
              Tiêu đề (tự động điền từ dòng đầu)
            </label>
            <input
              value={title}
              onChange={e => setTitle(e.target.value)}
              placeholder="VD: Q3 Budget Review Email"
              className="w-full rounded-[8px] border border-[#e8e8e8] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-4 py-2.5 text-[13px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#bbb] outline-none focus:border-[#999] dark:focus:border-[#555] transition-colors"
            />
          </div>

          {/* Topic link */}
          {topics.length > 0 && (
            <div>
              <label className="text-[11px] font-medium uppercase tracking-widest text-[#888] mb-1.5 block">
                Liên kết chủ đề từ vựng (tuỳ chọn)
              </label>
              <select
                value={topicId}
                onChange={e => setTopicId(e.target.value)}
                className="w-full rounded-[8px] border border-[#e8e8e8] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-4 py-2.5 text-[13px] text-[#171717] dark:text-[#f5f5f5] outline-none focus:border-[#999] dark:focus:border-[#555] transition-colors"
              >
                <option value="">— Không liên kết —</option>
                {topics.map(t => (
                  <option key={t.id} value={String(t.id)}>{t.name}</option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 shrink-0">
          <button
            onClick={handleSave}
            disabled={!content.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] py-2.5 text-[13px] font-semibold hover:opacity-85 disabled:opacity-40 transition-opacity"
          >
            <Mail className="h-4 w-4" /> Lưu email
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── Email detail modal ─────────────────────────────────── */
interface DetailModalProps {
  email: PracticeEmail
  onClose: () => void
  onDelete: () => void
  onExtracted: () => void
}

function DetailModal({ email, onClose, onDelete, onExtracted }: DetailModalProps) {
  const router = useRouter()
  const [extracting, setExtracting] = useState(false)
  const [editing, setEditing]       = useState(false)
  const [titleVal, setTitleVal]     = useState(email.title)

  async function handleExtract() {
    // Navigate to the linked topic with Quick Capture pre-filled
    if (!email.topic_id) {
      toast('Liên kết chủ đề trước để trích câu vào SRS')
      return
    }
    setExtracting(true)
    markExtracted(email.id)
    onExtracted()
    // Navigate to topic; user opens Quick Capture and pastes manually
    // (full auto-integration would require passing content via URL param)
    router.push(`/topics/${email.topic_id}`)
    toast('Mở Quick Capture và paste nội dung email để AI trích câu')
    onClose()
    setExtracting(false)
  }

  function handleDeleteConfirm() {
    if (confirm('Xoá email này?')) { deleteEmail(email.id); onDelete() }
  }

  function saveTitle() {
    if (titleVal.trim()) { updateTitle(email.id, titleVal.trim()); setEditing(false) }
  }

  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-[2px]" onClick={onClose} />
      <div
        className="fixed left-1/2 top-1/2 z-50 w-full max-w-2xl -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white dark:bg-[#141414] flex flex-col"
        style={{ boxShadow: 'rgba(0,0,0,0.2) 0px 8px 40px, rgba(0,0,0,0.08) 0px 0px 0px 1px', maxHeight: '88vh' }}
      >
        {/* Header */}
        <div className="flex items-start gap-3 px-5 py-4 border-b border-[#f0f0f0] dark:border-[#2a2a2a] shrink-0">
          <Mail className="h-4 w-4 text-[#666] mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            {editing ? (
              <div className="flex gap-2">
                <input
                  autoFocus
                  value={titleVal}
                  onChange={e => setTitleVal(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditing(false) }}
                  className="flex-1 text-[14px] font-semibold bg-transparent border-b border-[#e8e8e8] dark:border-[#2a2a2a] outline-none text-[#171717] dark:text-[#f5f5f5] pb-0.5"
                />
                <button onClick={saveTitle} className="text-[11px] text-blue-500 hover:text-blue-600">Lưu</button>
                <button onClick={() => setEditing(false)} className="text-[11px] text-[#bbb]">Huỷ</button>
              </div>
            ) : (
              <button onClick={() => setEditing(true)} className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5] text-left hover:text-[#555] truncate block w-full">
                {email.title}
              </button>
            )}
            <div className="flex items-center gap-3 mt-0.5">
              <span className="text-[11px] text-[#bbb]">{fmtRelative(email.created_at)} · {email.word_count} từ</span>
              {email.topic_name && (
                <span className="text-[11px] text-[#999] flex items-center gap-1">
                  <BookOpen className="h-3 w-3" /> {email.topic_name}
                </span>
              )}
              {email.extracted && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-500 font-medium">
                  <CheckCircle2 className="h-3 w-3" /> Đã trích câu
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#666] shrink-0">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <pre className="text-[13px] text-[#333] dark:text-[#ddd] whitespace-pre-wrap font-sans leading-relaxed">
            {email.content}
          </pre>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2 px-5 py-4 border-t border-[#f0f0f0] dark:border-[#2a2a2a] shrink-0">
          <button
            onClick={handleExtract}
            disabled={extracting}
            className="flex-1 flex items-center justify-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] py-2 text-[13px] font-semibold hover:opacity-85 disabled:opacity-50 transition-opacity"
          >
            {extracting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
            Trích câu vào SRS
          </button>
          <button
            onClick={handleDeleteConfirm}
            className="flex items-center justify-center h-9 w-9 rounded-[8px] text-[#bbb] hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
            title="Xoá"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>
      </div>
    </>
  )
}

/* ─── Email card ─────────────────────────────────────────── */
function EmailCard({ email, onClick }: { email: PracticeEmail; onClick: () => void }) {
  const preview = email.content.replace(/\n+/g, ' ').slice(0, 120)
  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-[10px] bg-white dark:bg-[#141414] px-4 py-3.5 hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a] transition-colors"
      style={{ boxShadow: 'var(--shadow-card)' }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Mail className="h-3.5 w-3.5 text-[#bbb] shrink-0" />
            <p className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">{email.title}</p>
            {email.extracted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0" title="Đã trích câu" />}
          </div>
          <p className="text-[12px] text-[#888] line-clamp-2 leading-relaxed">{preview}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-[#bbb]">
              <Clock className="h-3 w-3" /> {fmtRelative(email.created_at)}
            </span>
            <span className="flex items-center gap-1 text-[11px] text-[#bbb]">
              <FileText className="h-3 w-3" /> {email.word_count} từ
            </span>
            {email.topic_name && (
              <span className="flex items-center gap-1 text-[11px] text-[#aaa]">
                <BookOpen className="h-3 w-3" /> {email.topic_name}
              </span>
            )}
          </div>
        </div>
        <ChevronRight className="h-4 w-4 text-[#ddd] shrink-0 mt-0.5" />
      </div>
    </button>
  )
}

/* ─── Page ───────────────────────────────────────────────── */
export default function PracticeEmailsPage() {
  const router = useRouter()
  const [emails, setEmails]         = useState<PracticeEmail[]>([])
  const [showAdd, setShowAdd]       = useState(false)
  const [selected, setSelected]     = useState<PracticeEmail | null>(null)
  const [filter, setFilter]         = useState<'all' | 'pending' | 'done'>('all')

  useEffect(() => { setEmails(getEmails()) }, [])

  function refresh() { setEmails(getEmails()) }

  const filtered = emails.filter(e => {
    if (filter === 'pending') return !e.extracted
    if (filter === 'done')    return e.extracted
    return true
  })

  const doneCount    = emails.filter(e => e.extracted).length
  const pendingCount = emails.filter(e => !e.extracted).length

  return (
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#0a0a0a]">
      {/* Header */}
      <header className="bg-white dark:bg-[#0a0a0a] sticky top-0 z-10" style={{ boxShadow: 'var(--shadow-nav-bottom)' }}>
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="flex-1">
            <h1 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">📧 Email luyện tập</h1>
            <p className="text-[11px] text-[#999]">Từ NotebookLM Vocab prompts</p>
          </div>
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] px-3 py-1.5 text-[12px] font-medium hover:opacity-85 transition-opacity"
          >
            <Plus className="h-3.5 w-3.5" /> Thêm
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-6 space-y-5">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'Tổng email', value: emails.length, icon: Mail },
            { label: 'Chưa trích', value: pendingCount, icon: Zap, accent: pendingCount > 0 },
            { label: 'Đã trích', value: doneCount, icon: CheckCircle2, green: true },
          ].map(s => (
            <div key={s.label} className="rounded-[10px] bg-white dark:bg-[#141414] px-4 py-3 text-center" style={{ boxShadow: 'var(--shadow-card)' }}>
              <p className={cn('text-[22px] font-bold tabular-nums', s.green ? 'text-emerald-500' : s.accent ? 'text-amber-500' : 'text-[#171717] dark:text-[#f5f5f5]')}>
                {s.value}
              </p>
              <p className="text-[11px] text-[#999] mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Filter tabs */}
        <div className="flex gap-1.5">
          {([['all', 'Tất cả'], ['pending', 'Chưa trích'], ['done', 'Đã trích']] as const).map(([k, l]) => (
            <button
              key={k}
              onClick={() => setFilter(k)}
              className={cn(
                'rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors',
                filter === k
                  ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                  : 'bg-white dark:bg-[#141414] text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'
              )}
              style={filter !== k ? { boxShadow: 'var(--shadow-border)' } : undefined}
            >{l}</button>
          ))}
        </div>

        {/* List */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Mail className="h-10 w-10 text-[#e0e0e0] mx-auto mb-3" />
            <p className="text-[14px] text-[#bbb]">
              {emails.length === 0
                ? 'Chưa có email nào — dùng NotebookLM Vocab Prompt rồi paste vào đây'
                : 'Không có email phù hợp bộ lọc'}
            </p>
            {emails.length === 0 && (
              <button
                onClick={() => setShowAdd(true)}
                className="mt-4 flex items-center gap-2 mx-auto rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] px-4 py-2 text-[13px] font-medium hover:opacity-85 transition-opacity"
              >
                <Plus className="h-4 w-4" /> Thêm email đầu tiên
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-2.5">
            {filtered.map(e => (
              <EmailCard key={e.id} email={e} onClick={() => setSelected(e)} />
            ))}
          </div>
        )}

        {/* Tip */}
        {emails.length > 0 && (
          <div className="rounded-[8px] bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex items-start gap-2.5">
            <span className="text-base shrink-0">💡</span>
            <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
              <strong>Workflow:</strong> Dùng NotebookLM → Prompt #1 (Vocab email) → Copy email → Paste vào đây →
              Click "Trích câu vào SRS" → Mở Quick Capture trong topic → Paste email → AI tự trích câu vào hàng đợi ôn tập.
            </p>
          </div>
        )}
      </main>

      {/* Modals */}
      {showAdd && (
        <AddModal
          onClose={() => setShowAdd(false)}
          onAdded={() => { refresh(); toast.success('Đã lưu email') }}
        />
      )}
      {selected && (
        <DetailModal
          email={selected}
          onClose={() => setSelected(null)}
          onDelete={() => { refresh(); setSelected(null); toast('Đã xoá') }}
          onExtracted={() => { refresh(); setSelected(null) }}
        />
      )}
    </div>
  )
}
