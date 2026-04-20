'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Copy, Check, Mail, Plus, Trash2, Zap, CheckCircle2, ExternalLink, Clock, FileText } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { PROMPTS, PROMPT_GROUPS, GROUP_DESC, type NLMPrompt } from '@/lib/nlm-prompts'
import { getEmails, addEmail, deleteEmail, markExtracted, type PracticeEmail } from '@/lib/practice-emails'
import { apiFetch } from '@/lib/api-client'

/* ── helpers ── */
function fmtRelative(iso: string) {
  const h = Math.floor((Date.now() - new Date(iso).getTime()) / 3_600_000)
  if (h < 1) return 'Vừa xong'; if (h < 24) return `${h}g trước`
  return `${Math.floor(h / 24)}d trước`
}

/* ── Tab button ── */
function Tab({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button onClick={onClick} className={cn(
      'flex-1 py-2 text-[13px] font-medium rounded-[8px] transition-colors',
      active ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
              : 'bg-white dark:bg-[#141414] text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a]'
    )} style={!active ? { boxShadow: 'var(--shadow-border)' } : undefined}>{label}</button>
  )
}

/* ── Prompt card ── */
function PromptCard({ p }: { p: NLMPrompt }) {
  const [copied, setCopied] = useState(false)
  function copy() { navigator.clipboard.writeText(p.template); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  return (
    <div className="rounded-[10px] bg-white dark:bg-[#141414] overflow-hidden" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="px-4 py-3 flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#222]">
        <p className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5]">{p.title}</p>
        <button onClick={copy} className={cn(
          'flex items-center gap-1 rounded-[6px] px-2.5 py-1.5 text-[11px] font-medium transition-all shrink-0 ml-3',
          copied ? 'bg-emerald-500 text-white' : 'bg-white dark:bg-[#2a2a2a] text-[#666] dark:text-[#aaa]'
        )} style={{ boxShadow: 'var(--shadow-border)' }}>
          {copied ? <><Check className="h-3 w-3"/>Đã copy!</> : <><Copy className="h-3 w-3"/>Copy</>}
        </button>
      </div>
      <pre className="whitespace-pre-wrap text-[12px] text-[#444] dark:text-[#ccc] leading-relaxed px-4 py-3 font-sans">{p.template}</pre>
    </div>
  )
}

/* ── Email card ── */
function EmailCard({ email, onDelete, onExtract }: { email: PracticeEmail; onDelete: ()=>void; onExtract: ()=>void }) {
  const router = useRouter()
  return (
    <div className="rounded-[10px] bg-white dark:bg-[#141414] px-4 py-3.5" style={{ boxShadow: 'var(--shadow-card)' }}>
      <div className="flex items-start gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <p className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">{email.title}</p>
            {email.extracted && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0"/>}
          </div>
          <p className="text-[12px] text-[#888] line-clamp-2">{email.content.slice(0,120)}</p>
          <div className="flex items-center gap-3 mt-1.5">
            <span className="flex items-center gap-1 text-[11px] text-[#bbb]"><Clock className="h-3 w-3"/>{fmtRelative(email.created_at)}</span>
            <span className="flex items-center gap-1 text-[11px] text-[#bbb]"><FileText className="h-3 w-3"/>{email.word_count}từ</span>
            {email.topic_name && <span className="text-[11px] text-[#aaa]">📚 {email.topic_name}</span>}
          </div>
        </div>
        <div className="flex gap-1 shrink-0">
          {!email.extracted && email.topic_id && (
            <button onClick={() => { markExtracted(email.id); router.push(`/topics/${email.topic_id}`); toast('Mở Quick Capture → paste email'); onExtract() }}
              className="p-1.5 text-[#bbb] hover:text-emerald-500 transition-colors" title="Trích câu vào SRS">
              <Zap className="h-4 w-4"/>
            </button>
          )}
          <button onClick={() => { if(confirm('Xoá?')){ deleteEmail(email.id); onDelete() } }}
            className="p-1.5 text-[#bbb] hover:text-red-500 transition-colors"><Trash2 className="h-4 w-4"/></button>
        </div>
      </div>
    </div>
  )
}

/* ── Add Email Modal ── */
function AddEmailModal({ onClose, onAdded }: { onClose:()=>void; onAdded:()=>void }) {
  const [content, setContent] = useState('')
  const [title, setTitle]     = useState('')
  const [topicId, setTopicId] = useState('')
  const [topics, setTopics]   = useState<{id:number;name:string}[]>([])
  useEffect(() => {
    apiFetch<{id:number;name:string}[]>('/api/topics').then(d => setTopics(Array.isArray(d) ? d : [])).catch(()=>{})
  }, [])
  useEffect(() => {
    if (!title && content.trim()) {
      const fl = content.trim().split('\n')[0].replace(/^(subject:|re:|fw:)/i,'').trim()
      if (fl.length > 5 && fl.length < 80) setTitle(fl)
    }
  }, [content]) // eslint-disable-line
  function save() {
    if (!content.trim()) return
    const t = topics.find(x => String(x.id) === topicId)
    addEmail({ title: title.trim() || `Email ${new Date().toLocaleDateString('vi-VN')}`, content: content.trim(), source:'notebooklm', topic_id: t?.id, topic_name: t?.name, extracted: false })
    onAdded(); onClose()
  }
  return (
    <>
      <div className="fixed inset-0 z-50 bg-black/40" onClick={onClose}/>
      <div className="fixed left-1/2 top-1/2 z-50 w-full max-w-lg -translate-x-1/2 -translate-y-1/2 rounded-[12px] bg-white dark:bg-[#141414] flex flex-col max-h-[88vh]"
        style={{ boxShadow:'rgba(0,0,0,0.2) 0px 8px 40px, rgba(0,0,0,0.08) 0px 0px 0px 1px' }}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#2a2a2a] shrink-0">
          <p className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5]">📧 Thêm email luyện tập</p>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#666] text-lg leading-none">×</button>
        </div>
        <div className="p-5 space-y-3 overflow-y-auto flex-1">
          <div>
            <label className="text-[11px] uppercase tracking-widest text-[#888] mb-1 block">Nội dung email (paste từ NotebookLM)</label>
            <textarea autoFocus value={content} onChange={e=>setContent(e.target.value)} rows={7}
              placeholder={"Subject: Q3 Budget Review\n\nDear team, I'd like to implement (thực hiện)..."}
              className="w-full rounded-[8px] bg-white dark:bg-[#1a1a1a] px-4 py-3 text-[13px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#ccc] outline-none resize-none font-mono leading-relaxed"/>
          </div>
          <div>
            <label className="text-[11px] uppercase tracking-widest text-[#888] mb-1 block">Tiêu đề</label>
            <input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Tự điền từ dòng đầu email"
              className="w-full rounded-[8px] bg-white dark:bg-[#1a1a1a] px-4 py-2.5 text-[13px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#bbb] outline-none"/>
          </div>
          {topics.length > 0 && (
            <div>
              <label className="text-[11px] uppercase tracking-widest text-[#888] mb-1 block">Liên kết topic (để trích câu SRS)</label>
              <select value={topicId} onChange={e=>setTopicId(e.target.value)}
                className="w-full rounded-[8px] bg-white dark:bg-[#1a1a1a] px-4 py-2.5 text-[13px] text-[#171717] dark:text-[#f5f5f5] outline-none">
                <option value="">— Không liên kết —</option>
                {topics.map(t=><option key={t.id} value={String(t.id)}>{t.name}</option>)}
              </select>
            </div>
          )}
        </div>
        <div className="px-5 pb-5 shrink-0">
          <button onClick={save} disabled={!content.trim()}
            className="w-full flex items-center justify-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] py-2.5 text-[13px] font-semibold hover:opacity-85 disabled:opacity-40 transition-opacity">
            <Mail className="h-4 w-4"/> Lưu email
          </button>
        </div>
      </div>
    </>
  )
}

/* ── Main page ── */
export default function NotebookLMPage() {
  const router = useRouter()
  const [tab, setTab]           = useState<'prompts'|'emails'>('prompts')
  const [promptGroup, setPromptGroup] = useState('Từ vựng')
  const [emails, setEmails]     = useState<PracticeEmail[]>([])
  const [showAdd, setShowAdd]   = useState(false)
  const [emailFilter, setEmailFilter] = useState<'all'|'pending'|'done'>('all')

  useEffect(() => { if (tab==='emails') setEmails(getEmails()) }, [tab])
  function refreshEmails() { setEmails(getEmails()) }

  const filtered = PROMPTS.filter(p => p.group === promptGroup)
  const filteredEmails = emails.filter(e =>
    emailFilter === 'pending' ? !e.extracted : emailFilter === 'done' ? e.extracted : true
  )

  return (
    <div className="min-h-screen bg-[#f9f9f9] dark:bg-[#0a0a0a] page-content">
      {/* Header */}
      <header className="bg-white dark:bg-[#0a0a0a] sticky top-0 z-10" style={{ boxShadow:'var(--shadow-nav-bottom)' }}>
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <button onClick={()=>router.back()} className="text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors">
            <ArrowLeft className="h-4 w-4"/>
          </button>
          <div className="flex-1">
            <h1 className="text-[15px] font-semibold text-[#171717] dark:text-[#f5f5f5]">📓 NotebookLM Hub</h1>
            <p className="text-[11px] text-[#999]">Prompts · Email luyện tập</p>
          </div>
          <a href="https://notebooklm.google.com/notebook/d2ee902b-eaa7-4dc3-8d59-b7801d8308ab"
            target="_blank" rel="noopener noreferrer"
            className="flex items-center gap-1.5 rounded-[8px] px-3 py-1.5 text-[12px] font-medium text-[#666] dark:text-[#aaa] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors"
            style={{ boxShadow:'var(--shadow-border)' }}>
            Mở NLM <ExternalLink className="h-3 w-3"/>
          </a>
        </div>
      </header>

      <main className="mx-auto max-w-2xl px-4 py-5 space-y-4">
        {/* Main tabs */}
        <div className="flex gap-2">
          <Tab label="📋 Prompts" active={tab==='prompts'} onClick={()=>setTab('prompts')}/>
          <Tab label="📧 Email luyện tập" active={tab==='emails'} onClick={()=>setTab('emails')}/>
        </div>

        {/* ─── PROMPTS TAB ─── */}
        {tab === 'prompts' && (
          <>
            <div className="tabs-scroll">
              {PROMPT_GROUPS.map(g => (
                <button key={g} onClick={()=>setPromptGroup(g)} className={cn(
                  'rounded-[8px] px-3 py-1.5 text-[11px] font-medium transition-colors whitespace-nowrap',
                  promptGroup===g ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                                  : 'bg-white dark:bg-[#141414] text-[#666] dark:text-[#aaa]'
                )} style={promptGroup!==g ? {boxShadow:'var(--shadow-border)'} : undefined}>{g}</button>
              ))}
            </div>
            <p className="text-[11px] text-[#999] -mt-1">{GROUP_DESC[promptGroup]}</p>
            <div className="space-y-3">
              {filtered.map(p => <PromptCard key={p.id} p={p}/>)}
            </div>
          </>
        )}

        {/* ─── EMAILS TAB ─── */}
        {tab === 'emails' && (
          <>
            <div className="flex items-center gap-2">
              <div className="flex gap-1.5 flex-1">
                {(['all','pending','done'] as const).map(f => (
                  <button key={f} onClick={()=>setEmailFilter(f)} className={cn(
                    'flex-1 rounded-[8px] py-1.5 text-[11px] font-medium transition-colors',
                    emailFilter===f ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717]'
                                    : 'bg-white dark:bg-[#141414] text-[#666] dark:text-[#aaa]'
                  )} style={emailFilter!==f ? {boxShadow:'var(--shadow-border)'} : undefined}>
                    {f==='all'?'Tất cả':f==='pending'?'Chưa trích':'Đã trích'}
                  </button>
                ))}
              </div>
              <button onClick={()=>setShowAdd(true)}
                className="flex items-center gap-1.5 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] px-3 py-1.5 text-[12px] font-medium hover:opacity-85 transition-opacity">
                <Plus className="h-3.5 w-3.5"/> Thêm
              </button>
            </div>

            {filteredEmails.length === 0
              ? <div className="text-center py-12">
                  <Mail className="h-10 w-10 text-[#e0e0e0] mx-auto mb-3"/>
                  <p className="text-[13px] text-[#bbb]">
                    {emails.length===0 ? 'Paste email từ NLM Prompt #1 vào đây để lưu' : 'Không có email phù hợp'}
                  </p>
                  {emails.length===0 && (
                    <button onClick={()=>setShowAdd(true)}
                      className="mt-4 mx-auto flex items-center gap-2 rounded-[8px] bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] px-4 py-2 text-[13px] font-medium hover:opacity-85 transition-opacity">
                      <Plus className="h-4 w-4"/> Thêm email đầu tiên
                    </button>
                  )}
                </div>
              : <div className="space-y-2.5">
                  {filteredEmails.map(e => (
                    <EmailCard key={e.id} email={e}
                      onDelete={refreshEmails}
                      onExtract={refreshEmails}/>
                  ))}
                </div>
            }

            <div className="rounded-[8px] bg-amber-50 dark:bg-amber-900/20 px-4 py-3 flex gap-2.5">
              <span className="shrink-0">💡</span>
              <p className="text-[12px] text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>Workflow:</strong> Prompt #1 → NLM sinh email → Copy → "+ Thêm" → Lưu → "⚡ Trích câu" → Dùng Quick Capture trong topic để đưa vào SRS.
              </p>
            </div>
          </>
        )}
      </main>

      {showAdd && <AddEmailModal onClose={()=>setShowAdd(false)} onAdded={()=>{refreshEmails();toast.success('Đã lưu email')}}/>}
    </div>
  )
}
