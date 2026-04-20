'use client'

import { useState, useRef } from 'react'
import {
  Clipboard, Sparkles, Loader2, Check, X, ChevronDown,
  Plus, ArrowRight, BookOpen,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { toast } from 'sonner'
import type { CapturedSentence } from '@/app/api/phrases/quick-capture/route'
import type { TopicWithCount } from '@/db/schema'

/* ─── Step states ────────────────────────────────────────────── */
type Step = 'input' | 'review' | 'done'

interface Props {
  topics: TopicWithCount[]
  defaultTopicId?: number
  onClose: () => void
  onAdded?: (topicId: number, count: number) => void
}

export function QuickCaptureModal({ topics, defaultTopicId, onClose, onAdded }: Props) {
  const [step, setStep] = useState<Step>('input')
  const [rawText, setRawText]           = useState('')
  const [extracting, setExtracting]     = useState(false)
  const [sentences, setSentences]       = useState<CapturedSentence[]>([])
  const [selected, setSelected]         = useState<Set<number>>(new Set())
  const [topicId, setTopicId]           = useState<number>(defaultTopicId ?? topics[0]?.id ?? 0)
  const [adding, setAdding]             = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  /* ── Paste from clipboard ── */
  async function handlePaste() {
    try {
      const text = await navigator.clipboard.readText()
      setRawText(text)
      toast('Đã dán từ clipboard')
    } catch {
      toast.error('Không đọc được clipboard — dán thủ công nhé')
    }
  }

  /* ── Extract sentences via AI ── */
  async function handleExtract() {
    if (!rawText.trim() || rawText.trim().length < 20) {
      toast.error('Vui lòng nhập ít nhất 20 ký tự')
      return
    }
    setExtracting(true)
    try {
      const res = await apiFetch<{ sentences: CapturedSentence[] }>('/api/phrases/quick-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: rawText }),
      })
      setSentences(res.sentences)
      // Select all by default
      setSelected(new Set(res.sentences.map((_, i) => i)))
      setStep('review')
    } catch {
      toast.error('Lỗi khi trích xuất câu. Thử lại sau.')
    } finally {
      setExtracting(false)
    }
  }

  /* ── Toggle sentence selection ── */
  function toggleSentence(idx: number) {
    setSelected(prev => {
      const next = new Set(prev)
      next.has(idx) ? next.delete(idx) : next.add(idx)
      return next
    })
  }

  /* ── Add selected sentences to topic ── */
  async function handleAdd() {
    if (selected.size === 0) { toast.error('Chọn ít nhất 1 câu'); return }
    if (!topicId) { toast.error('Chọn chủ đề để thêm vào'); return }

    const toAdd = [...selected].map(i => ({
      sample_sentence: sentences[i].sentence,
      translation:     sentences[i].translation,
    }))

    setAdding(true)
    try {
      await apiFetch('/api/phrases/bulk', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic_id: topicId, data: toAdd }),
      })
      toast.success(`Đã thêm ${toAdd.length} câu vào chủ đề!`)
      onAdded?.(topicId, toAdd.length)
      setStep('done')
    } catch {
      toast.error('Thêm câu thất bại')
    } finally {
      setAdding(false)
    }
  }

  const selectedTopic = topics.find(t => t.id === topicId)

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/30 backdrop-blur-sm p-4">
      <div
        className="w-full max-w-lg rounded-2xl bg-white dark:bg-[#111] overflow-hidden"
        style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.18)' }}
      >

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-amber-500" />
            <span className="text-[14px] font-semibold text-[#171717] dark:text-[#f5f5f5]">
              Quick Capture
            </span>
            {step === 'review' && (
              <span className="ml-1 text-[11px] font-medium text-[#999]">
                — {sentences.length} câu trích xuất
              </span>
            )}
          </div>
          <button onClick={onClose} className="text-[#bbb] hover:text-[#666] transition-colors">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* ── STEP 1: Input ── */}
        {step === 'input' && (
          <div className="p-5 space-y-4">
            <div>
              <p className="text-[12px] text-[#999] mb-2">
                Dán transcript từ <strong>DailyDictation</strong>, podcast, bài báo... AI sẽ tự trích câu hay nhất.
              </p>
              <div className="relative">
                <textarea
                  ref={textareaRef}
                  value={rawText}
                  onChange={e => setRawText(e.target.value)}
                  placeholder="Paste your English text here...&#10;&#10;Ví dụ: transcript từ Daily Dictation, BBC News, TED Talk..."
                  rows={8}
                  className="w-full rounded-xl border border-[#e8e8e8] dark:border-[#2a2a2a] bg-[#fafafa] dark:bg-[#1a1a1a] px-4 py-3 text-[13px] text-[#171717] dark:text-[#f5f5f5] placeholder:text-[#bbb] outline-none resize-none leading-relaxed focus:border-[#171717] dark:focus:border-[#555] transition-colors"
                />
                {rawText && (
                  <span className="absolute bottom-2 right-3 text-[10px] text-[#bbb]">
                    {rawText.length} ký tự
                  </span>
                )}
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePaste}
                className="flex items-center gap-1.5 rounded-lg border border-[#e8e8e8] dark:border-[#2a2a2a] px-3 py-2 text-[12px] font-medium text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors"
              >
                <Clipboard className="h-3.5 w-3.5" /> Dán clipboard
              </button>
              <button
                onClick={() => { setRawText(''); textareaRef.current?.focus() }}
                className="flex items-center gap-1.5 rounded-lg border border-[#e8e8e8] dark:border-[#2a2a2a] px-3 py-2 text-[12px] font-medium text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors"
                disabled={!rawText}
              >
                <X className="h-3.5 w-3.5" /> Xóa
              </button>
              <button
                onClick={handleExtract}
                disabled={extracting || rawText.trim().length < 20}
                className={cn(
                  'ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all',
                  rawText.trim().length >= 20 && !extracting
                    ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90'
                    : 'bg-[#f0f0f0] dark:bg-[#222] text-[#bbb] cursor-not-allowed',
                )}
              >
                {extracting
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang trích...</>
                  : <><Sparkles className="h-3.5 w-3.5" /> Trích xuất AI</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 2: Review & Select ── */}
        {step === 'review' && (
          <div className="flex flex-col" style={{ maxHeight: '70vh' }}>

            {/* Topic selector */}
            <div className="px-5 py-3 border-b border-[#f0f0f0] dark:border-[#1e1e1e] flex items-center gap-2">
              <BookOpen className="h-3.5 w-3.5 text-[#999] shrink-0" />
              <span className="text-[12px] text-[#999] shrink-0">Thêm vào:</span>
              <div className="relative flex-1">
                <select
                  value={topicId}
                  onChange={e => setTopicId(Number(e.target.value))}
                  className="w-full appearance-none rounded-lg border border-[#e8e8e8] dark:border-[#2a2a2a] bg-white dark:bg-[#1a1a1a] px-3 py-1.5 text-[12px] font-semibold text-[#171717] dark:text-[#f5f5f5] outline-none pr-7 cursor-pointer"
                >
                  {topics.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.icon} {t.name} ({t.phrase_count} câu)
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-3 w-3 text-[#999] pointer-events-none" />
              </div>
            </div>

            {/* Select all / deselect all */}
            <div className="px-5 py-2 flex items-center justify-between border-b border-[#f0f0f0] dark:border-[#1e1e1e]">
              <span className="text-[11px] text-[#999]">
                Đã chọn <strong className="text-[#171717] dark:text-[#f5f5f5]">{selected.size}</strong> / {sentences.length} câu
              </span>
              <div className="flex gap-3">
                <button
                  onClick={() => setSelected(new Set(sentences.map((_, i) => i)))}
                  className="text-[11px] text-[#0072f5] hover:text-[#0060d0] font-medium"
                >Chọn tất cả</button>
                <button
                  onClick={() => setSelected(new Set())}
                  className="text-[11px] text-[#999] hover:text-[#666] font-medium"
                >Bỏ tất cả</button>
              </div>
            </div>

            {/* Sentence list */}
            <div className="overflow-y-auto flex-1 divide-y divide-[#f5f5f5] dark:divide-[#1e1e1e]">
              {sentences.map((s, i) => {
                const checked = selected.has(i)
                return (
                  <label
                    key={i}
                    className={cn(
                      'flex items-start gap-3 px-5 py-3 cursor-pointer transition-colors',
                      checked ? 'bg-amber-50/60 dark:bg-amber-900/10' : 'hover:bg-[#fafafa] dark:hover:bg-[#1a1a1a]',
                    )}
                  >
                    <div className="mt-0.5 shrink-0">
                      <div className={cn(
                        'flex h-4 w-4 items-center justify-center rounded-[4px] border-2 transition-colors',
                        checked
                          ? 'border-[#171717] bg-[#171717] dark:border-[#f5f5f5] dark:bg-[#f5f5f5]'
                          : 'border-[#ddd] dark:border-[#444]',
                      )}>
                        {checked && <Check className="h-2.5 w-2.5 text-white dark:text-[#171717]" />}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleSentence(i)}
                      className="sr-only"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] leading-snug">
                        {s.sentence}
                      </p>
                      <p className="text-[12px] text-[#666] dark:text-[#aaa] mt-0.5">
                        {s.translation}
                      </p>
                      {s.note && (
                        <p className="text-[10px] text-amber-600 dark:text-amber-400 mt-0.5 font-medium">
                          💡 {s.note}
                        </p>
                      )}
                    </div>
                  </label>
                )
              })}
            </div>

            {/* Action bar */}
            <div className="px-5 py-3 border-t border-[#f0f0f0] dark:border-[#1e1e1e] flex items-center gap-2">
              <button
                onClick={() => setStep('input')}
                className="text-[12px] text-[#999] hover:text-[#666] transition-colors"
              >
                ← Thay text
              </button>
              <button
                onClick={handleAdd}
                disabled={adding || selected.size === 0}
                className={cn(
                  'ml-auto flex items-center gap-1.5 rounded-lg px-4 py-2 text-[13px] font-semibold transition-all',
                  selected.size > 0 && !adding
                    ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90'
                    : 'bg-[#f0f0f0] dark:bg-[#222] text-[#bbb] cursor-not-allowed',
                )}
              >
                {adding
                  ? <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Đang thêm...</>
                  : <><Plus className="h-3.5 w-3.5" /> Thêm {selected.size} câu vào {selectedTopic?.icon} {selectedTopic?.name}</>
                }
              </button>
            </div>
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === 'done' && (
          <div className="p-8 flex flex-col items-center gap-4 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 dark:bg-emerald-900/20">
              <Check className="h-6 w-6 text-emerald-500" />
            </div>
            <div>
              <p className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5]">
                Đã thêm thành công!
              </p>
              <p className="text-[13px] text-[#999] mt-1">
                {selected.size} câu đã được lưu vào <strong>{selectedTopic?.icon} {selectedTopic?.name}</strong>.
                AI sẽ điền IPA + ví dụ khi bạn vào trang học.
              </p>
            </div>
            <div className="flex gap-2 mt-2">
              <button
                onClick={() => { setStep('input'); setRawText(''); setSentences([]) }}
                className="rounded-lg border border-[#e8e8e8] dark:border-[#2a2a2a] px-4 py-2 text-[13px] font-medium text-[#666] dark:text-[#aaa] hover:bg-[#f5f5f5] dark:hover:bg-[#1a1a1a] transition-colors"
              >
                Capture thêm
              </button>
              <button
                onClick={onClose}
                className="flex items-center gap-1.5 rounded-lg bg-[#171717] dark:bg-[#f5f5f5] px-4 py-2 text-[13px] font-semibold text-white dark:text-[#171717] hover:opacity-90 transition-all"
              >
                Xong <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
