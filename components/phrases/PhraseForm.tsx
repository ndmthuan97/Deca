'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Sparkles, Save, X, Loader2, BookOpen, MessageSquare } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Skeleton } from '@/components/ui/skeleton'
import type { Phrase } from '@/db/schema'
import { apiFetch } from '@/lib/api-client'

interface PhraseFormProps {
  topicId: number
  topicName: string
  onSuccess?: () => void
  onCancel?: () => void
  editPhrase?: Phrase
}

type PhraseFormData = {
  type: string
  structure: string
  function: string
  sample_sentence: string
  translation: string
  pronunciation: string
  example1: string
  example1_translation: string
  example1_pronunciation: string
  example2: string
  example2_translation: string
  example2_pronunciation: string
}

const EMPTY_FORM: PhraseFormData = {
  type: '', structure: '', function: '', sample_sentence: '',
  translation: '', pronunciation: '',
  example1: '', example1_translation: '', example1_pronunciation: '',
  example2: '', example2_translation: '', example2_pronunciation: '',
}

async function generateFields(sampleSentence: string, topicName: string) {
  return apiFetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ sampleSentence, topicName }),
  })
}

async function savePhrase(data: PhraseFormData & { topic_id: number }, editId?: number) {
  const url = editId ? `/api/phrases/${editId}` : '/api/phrases'
  return apiFetch(url, {
    method: editId ? 'PUT' : 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  })
}

// Reusable editable field row
function Field({ label, value, onChange, mono = false, multiline = false }: {
  label: string
  value: string
  onChange: (v: string) => void
  mono?: boolean
  multiline?: boolean
}) {
  return (
    <div className="group relative">
      <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-500">
        {label}
      </span>
      {multiline ? (
        <Textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={2}
          className={`resize-none border-0 border-b border-white/10 bg-transparent px-0 pb-1 text-sm shadow-none focus-visible:border-white/40 focus-visible:ring-0 ${mono ? 'font-mono text-[#60a5fa]' : 'text-white'}`}
        />
      ) : (
        <Input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`h-8 border-0 border-b border-white/10 bg-transparent px-0 shadow-none focus-visible:border-white/40 focus-visible:ring-0 ${mono ? 'font-mono text-[#60a5fa] text-sm' : 'text-white text-sm'}`}
        />
      )}
    </div>
  )
}

// Example card
function ExampleCard({ n, sentence, translation, pronunciation, onChange }: {
  n: number
  sentence: string
  translation: string
  pronunciation: string
  onChange: (field: 'sentence' | 'translation' | 'pronunciation', v: string) => void
}) {
  return (
    <div className="rounded-xl border border-white/8 bg-slate-800/60 p-4 space-y-3">
      <div className="flex items-center gap-2">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-white/10 text-[10px] font-bold text-white/60">
          {n}
        </span>
        <span className="text-xs font-medium text-slate-400">Ví dụ {n}</span>
      </div>

      <div className="space-y-3 pl-7">
        <div>
          <span className="mb-0.5 block text-[10px] uppercase tracking-wider text-slate-500">English</span>
          <Input
            value={sentence}
            onChange={(e) => onChange('sentence', e.target.value)}
            placeholder="Example sentence"
            className="h-8 border-0 border-b border-white/10 bg-transparent px-0 text-sm text-white shadow-none focus-visible:border-white/40 focus-visible:ring-0"
          />
        </div>
        <div>
          <span className="mb-0.5 block text-[10px] uppercase tracking-wider text-slate-500">Tiếng Việt</span>
          <Input
            value={translation}
            onChange={(e) => onChange('translation', e.target.value)}
            placeholder="Bản dịch"
            className="h-8 border-0 border-b border-white/10 bg-transparent px-0 text-sm text-slate-300 shadow-none focus-visible:border-white/40 focus-visible:ring-0"
          />
        </div>
        <div>
          <span className="mb-0.5 block text-[10px] uppercase tracking-wider text-slate-500">IPA</span>
          <Input
            value={pronunciation}
            onChange={(e) => onChange('pronunciation', e.target.value)}
            placeholder="/.../"
            className="h-8 border-0 border-b border-white/10 bg-transparent px-0 font-mono text-sm text-[#60a5fa] shadow-none focus-visible:border-white/40 focus-visible:ring-0"
          />
        </div>
      </div>
    </div>
  )
}

export function PhraseForm({ topicId, topicName, onSuccess, onCancel, editPhrase }: PhraseFormProps) {
  const queryClient = useQueryClient()
  const [form, setForm] = useState<PhraseFormData>(
    editPhrase
      ? {
          type: editPhrase.type || '',
          structure: editPhrase.structure || '',
          function: editPhrase.function || '',
          sample_sentence: editPhrase.sample_sentence,
          translation: editPhrase.translation || '',
          pronunciation: editPhrase.pronunciation || '',
          example1: editPhrase.example1 || '',
          example1_translation: editPhrase.example1_translation || '',
          example1_pronunciation: editPhrase.example1_pronunciation || '',
          example2: editPhrase.example2 || '',
          example2_translation: editPhrase.example2_translation || '',
          example2_pronunciation: editPhrase.example2_pronunciation || '',
        }
      : EMPTY_FORM
  )
  const [isGenerating, setIsGenerating] = useState(false)
  const [hasGenerated, setHasGenerated] = useState(!!editPhrase)
  const [inputMode, setInputMode] = useState<'sentence' | 'vocabulary' | null>(
    editPhrase ? 'sentence' : null
  )

  const update = (field: keyof PhraseFormData, value: string) =>
    setForm((prev) => ({ ...prev, [field]: value }))

  const saveMutation = useMutation({
    mutationFn: (data: PhraseFormData) =>
      savePhrase({ ...data, topic_id: topicId }, editPhrase?.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phrases', topicId] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success(editPhrase ? 'Đã cập nhật câu!' : 'Đã thêm câu mới!')
      onSuccess?.()
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleGenerate = async () => {
    if (!form.sample_sentence.trim()) {
      toast.error('Vui lòng nhập câu mẫu trước!')
      return
    }
    setIsGenerating(true)
    try {
      const result = await generateFields(form.sample_sentence, topicName)
      const { inputType, ...fields } = result as typeof result & { inputType?: string }
      setForm((prev) => ({ ...prev, ...fields }))
      setHasGenerated(true)
      setInputMode((inputType as 'sentence' | 'vocabulary') ?? 'sentence')
      const modeLabel = inputType === 'vocabulary' ? 'từ vựng 📖' : 'câu mẫu 💬'
      toast.success(`AI đã phân tích xong ${modeLabel}!`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Lỗi AI')
    } finally {
      setIsGenerating(false)
    }
  }

  return (
    <div className="flex flex-col gap-5">
      {/* ── Sample sentence ── */}
      <div className="space-y-2">
        <Label htmlFor="sample_sentence" className="text-sm font-semibold text-slate-200">
          Câu mẫu <span className="text-red-400">*</span>
        </Label>
        <div className="flex gap-2">
          <Input
            id="sample_sentence"
            placeholder="e.g. Who are you?"
            value={form.sample_sentence}
            onChange={(e) => update('sample_sentence', e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleGenerate()}
            className="border-white/10 bg-white/5 text-white placeholder:text-slate-500 focus:border-white/40"
          />
          <Button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="shrink-0 bg-[#f5f5f5] text-[#171717] hover:bg-white"
          >
            {isGenerating
              ? <Loader2 className="h-4 w-4 animate-spin" />
              : <Sparkles className="h-4 w-4" />}
            <span className="ml-2">{isGenerating ? 'Đang phân tích...' : 'AI Fill'}</span>
          </Button>
        </div>
      </div>

      {/* ── Loading skeletons ── */}
      {isGenerating && (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-8 w-full bg-white/5" />
          ))}
        </div>
      )}

      {/* ── AI-filled fields ── */}
      {!isGenerating && hasGenerated && (
        <div className="rounded-2xl border border-white/10 bg-slate-800/40 p-5">
          {/* AI badge + Mode indicator */}
          <div className="mb-4 flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs text-slate-300">
              <Sparkles className="h-3.5 w-3.5" />
              <span className="font-medium">AI đã phân tích — click vào ô để chỉnh sửa</span>
            </div>
            {inputMode && (
              <div className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${
                inputMode === 'vocabulary'
                  ? 'bg-sky-500/15 text-sky-300'
                  : 'bg-white/10 text-slate-200'
              }`}>
                {inputMode === 'vocabulary'
                  ? <><BookOpen className="h-3 w-3" /> Từ vựng</>
                  : <><MessageSquare className="h-3 w-3" /> Câu mẫu</>
                }
              </div>
            )}
          </div>

          {/* 2-column: main fields LEFT | examples RIGHT */}
          <div className="grid grid-cols-2 gap-6">
            {/* LEFT */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <Field
                  label={inputMode === 'vocabulary' ? 'Loại từ (Part of Speech)' : 'Loại câu (Type)'}
                  value={form.type}
                  onChange={(v) => update('type', v)}
                />
                <Field label="Phát âm IPA" value={form.pronunciation} onChange={(v) => update('pronunciation', v)} mono />
              </div>
              <Field
                label={inputMode === 'vocabulary' ? 'Dạng từ & Collocation' : 'Cấu trúc câu'}
                value={form.structure}
                onChange={(v) => update('structure', v)}
              />
              <div className="border-t border-white/5 pt-4 space-y-4">
                <Field
                  label={inputMode === 'vocabulary' ? 'Ý nghĩa & Cách dùng (Vietnamese)' : 'Chức năng (Vietnamese)'}
                  value={form.function}
                  onChange={(v) => update('function', v)}
                  multiline
                />
                <Field label="Dịch nghĩa (Vietnamese)" value={form.translation} onChange={(v) => update('translation', v)} multiline />
              </div>
            </div>

            {/* RIGHT: examples */}
            <div className="space-y-3 border-l border-white/5 pl-6">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Ví dụ</p>
              <ExampleCard
                n={1}
                sentence={form.example1}
                translation={form.example1_translation}
                pronunciation={form.example1_pronunciation}
                onChange={(field, v) => {
                  const map = { sentence: 'example1', translation: 'example1_translation', pronunciation: 'example1_pronunciation' } as const
                  update(map[field], v)
                }}
              />
              <ExampleCard
                n={2}
                sentence={form.example2}
                translation={form.example2_translation}
                pronunciation={form.example2_pronunciation}
                onChange={(field, v) => {
                  const map = { sentence: 'example2', translation: 'example2_translation', pronunciation: 'example2_pronunciation' } as const
                  update(map[field], v)
                }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Actions ── */}
      <div className="flex justify-end gap-3 border-t border-white/10 pt-4">
        {onCancel && (
          <Button variant="ghost" onClick={onCancel} className="text-slate-400 hover:text-white">
            <X className="mr-2 h-4 w-4" />Hủy
          </Button>
        )}
        <Button
          onClick={() => saveMutation.mutate(form)}
          disabled={saveMutation.isPending || !form.sample_sentence.trim()}
          className="bg-gradient-to-r from-emerald-600 to-teal-600 text-white hover:from-emerald-500 hover:to-teal-500"
        >
          {saveMutation.isPending
            ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            : <Save className="mr-2 h-4 w-4" />}
          {editPhrase ? 'Cập nhật' : 'Lưu câu'}
        </Button>
      </div>
    </div>
  )
}
