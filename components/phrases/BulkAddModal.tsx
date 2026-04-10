'use client'

import React, { useState, useRef, useCallback } from 'react'
import {
  Dialog, DialogContent, DialogHeader,
  DialogTitle, DialogDescription
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  UploadCloud, Sparkles, ChevronLeft, ChevronRight,
  Trash2, CheckCircle2, Loader2, X, BookOpen, MessageSquare,
  RefreshCw, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { cn } from '@/lib/utils'

/* ─── Types ─────────────────────────────────────────────────── */
type PhraseCard = {
  id: string
  sample_sentence: string
  translation: string
  pronunciation: string
  structure: string
  type: string
  function: string
  example1: string
  example1_translation: string
  example1_pronunciation: string
  example2: string
  example2_translation: string
  example2_pronunciation: string
  selected: boolean
  status: 'pending' | 'loading' | 'done' | 'error'
  inputType?: 'sentence' | 'vocabulary'
  retryCount: number       // số lần đã retry trong auto-retry
  errorMessage?: string    // lý do lỗi cuối cùng
}

type Step = 'input' | 'filling' | 'review'

/* ─── Props ──────────────────────────────────────────────────── */
interface BulkAddModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  topicId: number
  topicName: string
  onSuccess: () => void
}

/* ─── Constants ──────────────────────────────────────────────── */
const MAX_RETRIES = 3
const RETRY_BASE_DELAY_MS = 2000  // delays: 2s → 4s → 8s (exponential)

/* ─── Utils ──────────────────────────────────────────────────── */
function makeCard(sentence: string, overrides: Partial<PhraseCard> = {}): PhraseCard {
  return {
    id: Math.random().toString(36).slice(2),
    sample_sentence: sentence.trim(),
    translation: '', pronunciation: '', structure: '',
    type: '', function: '',
    example1: '', example1_translation: '', example1_pronunciation: '',
    example2: '', example2_translation: '', example2_pronunciation: '',
    selected: true, status: 'pending',
    retryCount: 0,
    ...overrides,
  }
}

async function callGenerateApi(sampleSentence: string, topicName: string) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleSentence, topicName }),
  })
  if (!res.ok) {
    const body = await res.json().catch(() => ({}))
    throw new Error(body.error ?? `HTTP ${res.status}`)
  }
  return res.json()
}

/**
 * Gọi AI tối đa (1 + maxRetries) lần với exponential backoff.
 * Trả về { result, retryCount } khi thành công, throw Error khi hết lần thử.
 */
async function generateWithRetry(
  sampleSentence: string,
  topicName: string,
  maxRetries: number,
  onAttempt: (attempt: number) => void
): Promise<{ result: Awaited<ReturnType<typeof callGenerateApi>>; retryCount: number }> {
  let lastError: Error = new Error('Unknown error')
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    if (attempt > 0) {
      const delayMs = RETRY_BASE_DELAY_MS * Math.pow(2, attempt - 1) // 2s, 4s, 8s
      await new Promise(r => setTimeout(r, delayMs))
      onAttempt(attempt)
    }
    try {
      const result = await callGenerateApi(sampleSentence, topicName)
      return { result, retryCount: attempt }
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err))
    }
  }
  throw lastError
}

/* ─── Sub-components ─────────────────────────────────────────── */
function StatusDot({ status }: { status: PhraseCard['status'] }) {
  if (status === 'loading') return <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400" />
  if (status === 'done')    return <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
  if (status === 'error')   return <AlertCircle className="h-3.5 w-3.5 text-red-500" />
  return <span className="h-3.5 w-3.5 rounded-full bg-gray-300 block" />
}

function ReviewCard({
  card,
  onToggleSelect,
  onChange,
  onRetry,
}: {
  card: PhraseCard
  onToggleSelect: () => void
  onChange: (field: keyof PhraseCard, value: string) => void
  onRetry: () => void
}) {
  return (
    <div className={cn(
      'rounded-2xl border bg-white transition-all overflow-hidden',
      card.status === 'error'
        ? 'border-red-200 bg-red-50/30'
        : card.selected ? 'border-orange-300' : 'border-gray-200 opacity-60'
    )}>
      {/* Card Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <StatusDot status={card.status} />
          {card.status === 'loading'
            ? <span className="text-sm text-gray-400 italic">
                {card.retryCount > 0 ? `Đang thử lại (${card.retryCount}/${MAX_RETRIES})...` : 'Đang phân tích...'}
              </span>
            : <span className="text-sm font-semibold text-gray-900 truncate">{card.sample_sentence}</span>
          }
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {/* Mode badge (only on done cards) */}
          {card.inputType && card.status === 'done' && (
            <div className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold ${
              card.inputType === 'vocabulary' ? 'bg-sky-100 text-sky-600' : 'bg-orange-100 text-orange-600'
            }`}>
              {card.inputType === 'vocabulary'
                ? <><BookOpen className="h-2.5 w-2.5" /> Từ vựng</>
                : <><MessageSquare className="h-2.5 w-2.5" /> Câu mẫu</>
              }
            </div>
          )}
          {/* Retry button (error cards only) */}
          {card.status === 'error' && (
            <button
              onClick={onRetry}
              className="flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium bg-red-100 text-red-600 hover:bg-orange-100 hover:text-orange-700 transition-colors"
            >
              <RefreshCw className="h-3 w-3" /> Thử lại
            </button>
          )}
          {/* Select / Deselect toggle (non-error cards only) */}
          {card.status !== 'error' && (
            <button
              onClick={onToggleSelect}
              className={cn(
                'flex items-center gap-1 rounded-full px-3 py-1 text-xs font-medium transition-colors',
                card.selected
                  ? 'bg-orange-100 text-orange-700 hover:bg-red-100 hover:text-red-600'
                  : 'bg-gray-100 text-gray-500 hover:bg-orange-100 hover:text-orange-600'
              )}
            >
              {card.selected
                ? <><CheckCircle2 className="h-3 w-3" /> Đã chọn</>
                : <><X className="h-3 w-3" /> Bỏ qua</>
              }
            </button>
          )}
        </div>
      </div>

      {/* Error body */}
      {card.status === 'error' && (
        <div className="px-5 py-4 flex items-start gap-3">
          <AlertCircle className="h-4 w-4 text-red-400 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-red-600">
              AI không thể phân tích sau {MAX_RETRIES} lần thử tự động
            </p>
            {card.errorMessage && (
              <p className="text-xs text-red-400 mt-0.5 font-mono">{card.errorMessage}</p>
            )}
            <p className="text-xs text-gray-500 mt-1">
              Bấm "Thử lại" để thử lại thủ công, hoặc bỏ qua mục này.
            </p>
          </div>
        </div>
      )}

      {/* Editable fields (done cards only) */}
      {card.status === 'done' && (
        <div className="grid grid-cols-2 gap-5 p-5">
          {/* Left column */}
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block mb-0.5 text-[10px] uppercase tracking-wider text-gray-400">
                  {card.inputType === 'vocabulary' ? 'Loại từ' : 'Loại câu'}
                </label>
                <Input value={card.type} onChange={e => onChange('type', e.target.value)}
                  className="h-7 border-0 border-b border-gray-200 bg-transparent px-0 text-sm text-gray-800 shadow-none focus-visible:border-orange-400 focus-visible:ring-0" />
              </div>
              <div>
                <label className="block mb-0.5 text-[10px] uppercase tracking-wider text-gray-400">IPA</label>
                <Input value={card.pronunciation} onChange={e => onChange('pronunciation', e.target.value)}
                  className="h-7 border-0 border-b border-gray-200 bg-transparent px-0 font-mono text-sm text-orange-600 shadow-none focus-visible:border-orange-400 focus-visible:ring-0" />
              </div>
            </div>
            <div>
              <label className="block mb-0.5 text-[10px] uppercase tracking-wider text-gray-400">
                {card.inputType === 'vocabulary' ? 'Dạng từ & Collocation' : 'Cấu trúc'}
              </label>
              <Input value={card.structure} onChange={e => onChange('structure', e.target.value)}
                className="h-7 border-0 border-b border-gray-200 bg-transparent px-0 text-sm text-gray-800 shadow-none focus-visible:border-orange-400 focus-visible:ring-0" />
            </div>
            <div>
              <label className="block mb-0.5 text-[10px] uppercase tracking-wider text-gray-400">Dịch nghĩa</label>
              <Input value={card.translation} onChange={e => onChange('translation', e.target.value)}
                className="h-7 border-0 border-b border-gray-200 bg-transparent px-0 text-sm text-gray-600 shadow-none focus-visible:border-orange-400 focus-visible:ring-0" />
            </div>
          </div>
          {/* Right column — examples */}
          <div className="space-y-2 border-l border-gray-100 pl-5">
            <p className="text-[10px] uppercase tracking-wider text-gray-400 mb-2">Ví dụ</p>
            {[1, 2].map((n) => {
              const pre = n === 1 ? 'example1' : 'example2'
              return (
                <div key={n} className="rounded-lg bg-gray-50 border border-gray-100 p-3 space-y-1.5">
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="flex h-4 w-4 items-center justify-center rounded-full bg-orange-100 text-[9px] font-bold text-orange-600">{n}</span>
                    <span className="text-[10px] text-gray-400">Ví dụ {n}</span>
                  </div>
                  <Input value={(card as any)[pre]} onChange={e => onChange(pre as any, e.target.value)} placeholder="Câu ví dụ"
                    className="h-6 border-0 border-b border-gray-200 bg-transparent px-0 text-xs text-gray-700 shadow-none focus-visible:border-orange-400 focus-visible:ring-0" />
                  <Input value={(card as any)[`${pre}_translation`]} onChange={e => onChange(`${pre}_translation` as any, e.target.value)} placeholder="Bản dịch"
                    className="h-6 border-0 border-b border-gray-200 bg-transparent px-0 text-xs text-gray-500 shadow-none focus-visible:border-orange-400 focus-visible:ring-0" />
                  <Input value={(card as any)[`${pre}_pronunciation`]} onChange={e => onChange(`${pre}_pronunciation` as any, e.target.value)} placeholder="IPA"
                    className="h-6 border-0 border-b border-gray-200 bg-transparent px-0 font-mono text-xs text-orange-600 shadow-none focus-visible:border-orange-400 focus-visible:ring-0" />
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}

/* ─── Main Component ─────────────────────────────────────────── */
export function BulkAddModal({ open, onOpenChange, topicId, topicName, onSuccess }: BulkAddModalProps) {
  const [step, setStep]       = useState<Step>('input')
  const [rawText, setRawText] = useState('')
  const [cards, setCards]     = useState<PhraseCard[]>([])
  const [cursor, setCursor]   = useState(0)
  const [saving, setSaving]   = useState(false)
  const fileInputRef          = useRef<HTMLInputElement>(null)

  /* ── Reset ── */
  const reset = () => {
    setStep('input'); setRawText(''); setCards([]); setCursor(0); setSaving(false)
  }

  /* ── Parse file ── */
  const parseFile = (file: File) => {
    const name = file.name.toLowerCase()
    const mapRow = (row: any): PhraseCard => makeCard(row.sample_sentence || '', {
      translation: row.translation || '',
      pronunciation: row.pronunciation || '',
      structure: row.structure || '',
      type: row.type || '',
      function: row.function || '',
      example1: row.example1 || '',
      example1_translation: row.example1_translation || '',
      example1_pronunciation: row.example1_pronunciation || '',
      example2: row.example2 || '',
      example2_translation: row.example2_translation || '',
      example2_pronunciation: row.example2_pronunciation || '',
      status: 'pending' as const,
    })

    if (name.endsWith('.csv')) {
      Papa.parse(file, {
        header: true, skipEmptyLines: true,
        complete: ({ data }: any) => {
          const parsed = (data as any[]).map(mapRow).filter(c => c.sample_sentence)
          if (!parsed.length) { toast.error('Không tìm thấy cột sample_sentence'); return }
          setCards(parsed)
          setRawText(parsed.map(c => c.sample_sentence).join('\n'))
        },
        error: () => toast.error('Lỗi đọc CSV'),
      })
    } else if (name.endsWith('.xlsx')) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const wb = XLSX.read(e.target?.result, { type: 'array' })
        const json = XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]) as any[]
        const parsed = json.map(mapRow).filter(c => c.sample_sentence)
        if (!parsed.length) { toast.error('Không tìm thấy cột sample_sentence'); return }
        setCards(parsed)
        setRawText(parsed.map(c => c.sample_sentence).join('\n'))
      }
      reader.readAsArrayBuffer(file)
    } else {
      toast.error('Chỉ hỗ trợ .csv và .xlsx')
    }
  }

  /* ── Core: fill 1 card by index with auto-retry ── */
  const fillCardAtIndex = useCallback(async (cardSnapshot: PhraseCard, i: number) => {
    try {
      const { result, retryCount } = await generateWithRetry(
        cardSnapshot.sample_sentence,
        topicName,
        MAX_RETRIES,
        (attempt) => {
          setCards(prev => prev.map((c, idx) =>
            idx === i ? { ...c, retryCount: attempt } : c
          ))
        }
      )
      const { inputType, ...fields } = result as typeof result & { inputType?: string }
      setCards(prev => prev.map((c, idx) =>
        idx === i
          ? { ...c, ...fields, inputType: inputType as PhraseCard['inputType'], status: 'done', retryCount, errorMessage: undefined }
          : c
      ))
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCards(prev => prev.map((c, idx) =>
        // auto-deselect failed cards
        idx === i ? { ...c, status: 'error', selected: false, errorMessage: msg } : c
      ))
    }
  }, [topicName])

  /* ── Start AI Fill (batch with auto-retry) ── */
  const startFill = useCallback(async () => {
    const sentences = rawText.split('\n').map(s => s.trim()).filter(Boolean)
    if (!sentences.length) { toast.error('Nhập ít nhất 1 mục'); return }

    const initial = sentences.map(s => makeCard(s, { status: 'loading' }))
    setCards(initial); setCursor(0); setStep('filling')

    // All cards process concurrently; each has its own retry loop
    await Promise.all(initial.map((card, i) => fillCardAtIndex(card, i)))

    setStep('review')

    // Summary toast
    setCards(prev => {
      const errCount = prev.filter(c => c.status === 'error').length
      if (errCount > 0) {
        toast.warning(
          `${prev.length - errCount}/${prev.length} mục thành công — ${errCount} lỗi sau ${MAX_RETRIES} lần thử`,
          { duration: 6000 }
        )
      } else {
        toast.success(`Tất cả ${prev.length} mục đã được phân tích!`)
      }
      return prev
    })
  }, [rawText, fillCardAtIndex])

  /* ── Manual retry single card by id (in review step) ── */
  const retryCard = useCallback(async (id: string) => {
    const card = cards.find(c => c.id === id)
    if (!card) return

    setCards(prev => prev.map(c =>
      c.id === id ? { ...c, status: 'loading', retryCount: 0, errorMessage: undefined } : c
    ))

    try {
      const result = await callGenerateApi(card.sample_sentence, topicName)
      const { inputType, ...fields } = result as typeof result & { inputType?: string }
      setCards(prev => prev.map(c =>
        c.id === id
          ? { ...c, ...fields, inputType: inputType as PhraseCard['inputType'], status: 'done', selected: true, errorMessage: undefined }
          : c
      ))
      toast.success(`"${card.sample_sentence}" phân tích xong!`)
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err)
      setCards(prev => prev.map(c =>
        c.id === id ? { ...c, status: 'error', errorMessage: msg } : c
      ))
      toast.error(`Vẫn lỗi: ${msg}`)
    }
  }, [cards, topicName])

  /* ── Field update & select toggle ── */
  const updateCard = (id: string, field: keyof PhraseCard, value: string) =>
    setCards(prev => prev.map(c => c.id === id ? { ...c, [field]: value } : c))

  const toggleSelect = (id: string) =>
    setCards(prev => prev.map(c => c.id === id ? { ...c, selected: !c.selected } : c))

  /* ── Save selected ── */
  const handleSave = async () => {
    const selected = cards.filter(c => c.selected && c.status !== 'error')
    if (!selected.length) { toast.error('Chưa có câu nào được chọn'); return }
    setSaving(true)
    try {
      const res = await fetch('/api/phrases/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, data: selected }),
      })
      if (!res.ok) throw new Error((await res.json()).error)
      const { count } = await res.json()
      toast.success(`Đã thêm ${count} câu thành công!`)
      onSuccess(); reset(); onOpenChange(false)
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setSaving(false)
    }
  }

  const selectedCount  = cards.filter(c => c.selected).length
  const errorCount     = cards.filter(c => c.status === 'error').length
  const errorCards     = cards.filter(c => c.status === 'error')
  const current        = cards[cursor]
  const [retryingAll, setRetryingAll] = useState(false)

  /* ── Retry all error cards sequentially ── */
  const retryAllErrors = useCallback(async () => {
    const targets = cards.filter(c => c.status === 'error')
    if (!targets.length) return
    setRetryingAll(true)
    for (const card of targets) {
      // reset to loading
      setCards(prev => prev.map(c =>
        c.id === card.id ? { ...c, status: 'loading', retryCount: 0, errorMessage: undefined } : c
      ))
      try {
        const result = await callGenerateApi(card.sample_sentence, topicName)
        const { inputType, ...fields } = result as typeof result & { inputType?: string }
        setCards(prev => prev.map(c =>
          c.id === card.id
            ? { ...c, ...fields, inputType: inputType as PhraseCard['inputType'], status: 'done', selected: true, errorMessage: undefined }
            : c
        ))
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err)
        setCards(prev => prev.map(c =>
          c.id === card.id ? { ...c, status: 'error', errorMessage: msg } : c
        ))
      }
    }
    setRetryingAll(false)
    setCards(prev => {
      const remaining = prev.filter(c => c.status === 'error').length
      if (remaining === 0) toast.success('Tất cả mục lỗi đã được phân tích xong!')
      else toast.warning(`Vẫn còn ${remaining} mục lỗi`, { duration: 5000 })
      return prev
    })
  }, [cards, topicName])

  return (
    <Dialog open={open} onOpenChange={(v) => { if (!v) reset(); onOpenChange(v) }}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto bg-white border-gray-200 text-gray-900">
        <DialogHeader>
          <DialogTitle className="text-gray-900 flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-orange-500" />
            Thêm nhiều câu với AI
          </DialogTitle>
          <DialogDescription className="text-gray-500">
            {step === 'input'   && 'Nhập danh sách câu/từ (mỗi dòng 1 mục) hoặc tải file lên, rồi bấm AI Fill.'}
            {step === 'filling' && `AI đang phân tích — lỗi sẽ tự động thử lại tối đa ${MAX_RETRIES} lần...`}
            {step === 'review'  &&
              `Xem lại ${cards.length} mục — ${selectedCount} đã chọn${errorCount > 0 ? ` · ${errorCount} lỗi` : ''}`
            }
          </DialogDescription>
        </DialogHeader>

        {/* ════════════ STEP: INPUT / FILLING ════════════ */}
        {(step === 'input' || step === 'filling') && (
          <div className="space-y-4 mt-2">
            <Textarea
              placeholder={"Who are you?\nWhat do you do?\nbeautiful\ngive up\nNice to meet you."}
              value={rawText}
              onChange={e => setRawText(e.target.value)}
              rows={8}
              disabled={step === 'filling'}
              className="border-gray-200 bg-gray-50 text-gray-800 placeholder:text-gray-400 focus:border-orange-500 font-mono resize-none text-sm"
            />

            <div
              className="flex items-center gap-3 rounded-lg border border-dashed border-gray-200 bg-gray-50 px-4 py-3 cursor-pointer hover:border-orange-400 transition-colors"
              onClick={() => fileInputRef.current?.click()}
            >
              <UploadCloud className="h-5 w-5 text-gray-400 shrink-0" />
              <p className="text-xs text-gray-500">
                Hoặc tải file <span className="text-orange-500">.csv / .xlsx</span> lên
                (cột <code className="bg-gray-100 px-1 rounded">sample_sentence</code> bắt buộc)
              </p>
              <input
                ref={fileInputRef} type="file"
                accept=".csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                className="hidden"
                onChange={e => { const f = e.target.files?.[0]; if (f) parseFile(f) }}
              />
            </div>

            {rawText.trim() && (
              <p className="text-xs text-gray-500">
                {rawText.split('\n').filter(s => s.trim()).length} mục được phát hiện
              </p>
            )}

            <div className="flex justify-end gap-3 pt-2">
              <Button variant="ghost" onClick={() => onOpenChange(false)} className="text-gray-500 hover:text-gray-900">
                Hủy
              </Button>
              <Button
                onClick={startFill}
                disabled={!rawText.trim() || step === 'filling'}
                className="bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-white"
              >
                {step === 'filling'
                  ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang phân tích...</>
                  : <><Sparkles className="mr-2 h-4 w-4" /> AI Fill</>
                }
              </Button>
            </div>

            {/* Live progress list */}
            {step === 'filling' && cards.length > 0 && (
              <div className="space-y-2 mt-2">
                {cards.map(c => (
                  <div key={c.id} className={cn(
                    'flex items-center gap-3 rounded-lg border px-4 py-2.5 transition-colors',
                    c.status === 'error' ? 'bg-red-50 border-red-100' : 'bg-gray-50 border-gray-100'
                  )}>
                    <StatusDot status={c.status} />
                    <span className="text-sm text-gray-600 truncate flex-1">{c.sample_sentence}</span>
                    {c.status === 'loading' && c.retryCount > 0 && (
                      <span className="text-xs text-orange-500 shrink-0">
                        Thử lại {c.retryCount}/{MAX_RETRIES}...
                      </span>
                    )}
                    {c.status === 'done'  && <span className="text-xs text-emerald-600 shrink-0">✓ Xong</span>}
                    {c.status === 'error' && <span className="text-xs text-red-500 shrink-0">✗ Lỗi</span>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ════════════ STEP: REVIEW ════════════ */}
        {step === 'review' && current && (
          <div className="space-y-4 mt-2">

            {/* ──────── ERROR SUMMARY PANEL (only when errors exist) ──────── */}
            {errorCount > 0 && (
              <div className="rounded-xl border border-red-200 bg-red-50 overflow-hidden">
                {/* Panel header */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-red-100">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="h-4 w-4 text-red-500" />
                    <span className="text-sm font-semibold text-red-700">
                      {errorCount} mục thất bại sau {MAX_RETRIES} lần thử tự động
                    </span>
                  </div>
                  <Button
                    size="sm"
                    disabled={retryingAll}
                    onClick={retryAllErrors}
                    className="bg-red-600 hover:bg-red-500 text-white h-7 px-3 text-xs gap-1.5"
                  >
                    {retryingAll
                      ? <><Loader2 className="h-3 w-3 animate-spin" /> Đang retry...</>
                      : <><RefreshCw className="h-3 w-3" /> Retry tất cả {errorCount} mục</>
                    }
                  </Button>
                </div>
                {/* Error item list */}
                <div className="divide-y divide-red-100">
                  {errorCards.map(c => (
                    <div key={c.id} className="flex items-center gap-3 px-4 py-2.5">
                      {c.status === 'loading'
                        ? <Loader2 className="h-3.5 w-3.5 animate-spin text-orange-400 shrink-0" />
                        : <AlertCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                      }
                      <p className="text-sm font-medium text-gray-800 truncate flex-1 min-w-0">{c.sample_sentence}</p>
                      <button
                        disabled={retryingAll || c.status === 'loading'}
                        onClick={() => retryCard(c.id)}
                        className="flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium bg-white border border-red-200 text-red-600 hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-colors disabled:opacity-40 shrink-0"
                      >
                        <RefreshCw className="h-2.5 w-2.5" /> Thử lại
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Navigation dots */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 flex-wrap">
                {cards.map((c, i) => (
                  <button
                    key={c.id}
                    onClick={() => setCursor(i)}
                    title={c.sample_sentence}
                    className={cn(
                      'h-2 rounded-full transition-all',
                      c.status === 'error'
                        ? (i === cursor ? 'w-6 bg-red-500' : 'w-2 bg-red-300')
                        : i === cursor ? 'w-6 bg-orange-500'
                        : c.selected ? 'w-2 bg-slate-400'
                        : 'w-2 bg-gray-200'
                    )}
                  />
                ))}
              </div>
              <span className="text-sm text-gray-500 shrink-0 ml-3">
                {cursor + 1} / {cards.length}
                {' • '}
                <span className="text-orange-600">{selectedCount} chọn</span>
                {errorCount > 0 && <span className="text-red-500"> · {errorCount} lỗi</span>}
              </span>
            </div>

            {/* Current card */}
            <ReviewCard
              card={current}
              onToggleSelect={() => toggleSelect(current.id)}
              onChange={(field, value) => updateCard(current.id, field, value)}
              onRetry={() => retryCard(current.id)}
            />

            {/* Navigation buttons */}
            <div className="flex items-center justify-between">
              <Button
                variant="outline"
                disabled={cursor === 0}
                onClick={() => setCursor(c => c - 1)}
                className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              >
                <ChevronLeft className="mr-1 h-4 w-4" /> Câu trước
              </Button>

              <Button
                variant="ghost"
                disabled={current.status === 'error'}
                onClick={() => { toggleSelect(current.id); if (cursor < cards.length - 1) setCursor(c => c + 1) }}
                className="text-red-400 hover:text-red-300 hover:bg-red-500/10 disabled:opacity-30"
              >
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
                {current.selected ? 'Bỏ câu này' : 'Chọn lại'}
              </Button>

              {cursor < cards.length - 1 ? (
                <Button
                  variant="outline"
                  onClick={() => setCursor(c => c + 1)}
                  className="border-gray-200 text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                >
                  Câu tiếp <ChevronRight className="ml-1 h-4 w-4" />
                </Button>
              ) : (
                <Button
                  onClick={handleSave}
                  disabled={saving || selectedCount === 0}
                  className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg"
                >
                  {saving
                    ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Đang lưu...</>
                    : <><CheckCircle2 className="mr-2 h-4 w-4" /> Thêm {selectedCount} câu</>
                  }
                </Button>
              )}
            </div>

            {/* Quick save (always visible when not on last card) */}
            {cursor < cards.length - 1 && (
              <div className="flex justify-end">
                <Button
                  onClick={handleSave}
                  disabled={saving || selectedCount === 0}
                  size="sm"
                  className="bg-gradient-to-r from-emerald-700 to-teal-700 hover:from-emerald-600 hover:to-teal-600 text-white"
                >
                  {saving
                    ? <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
                    : <CheckCircle2 className="mr-1.5 h-3.5 w-3.5" />
                  }
                  Thêm {selectedCount} câu ngay
                </Button>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
