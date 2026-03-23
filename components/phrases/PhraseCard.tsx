'use client'

import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { Trash2, Edit2, Volume2, ChevronDown, ChevronUp } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import type { Phrase } from '@/db/schema'

interface PhraseCardProps {
  phrase: Phrase
  topicName: string
  onEdit: (phrase: Phrase) => void
}

async function deletePhrase(id: number) {
  const res = await fetch(`/api/phrases/${id}`, { method: 'DELETE' })
  if (!res.ok) throw new Error('Failed to delete')
}

function speak(text: string) {
  if ('speechSynthesis' in window) {
    const utterance = new SpeechSynthesisUtterance(text)
    utterance.lang = 'en-US'
    window.speechSynthesis.speak(utterance)
  }
}

export function PhraseCard({ phrase, topicName, onEdit }: PhraseCardProps) {
  const queryClient = useQueryClient()
  const [expanded, setExpanded] = useState(false)

  const deleteMutation = useMutation({
    mutationFn: () => deletePhrase(phrase.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['phrases'] })
      queryClient.invalidateQueries({ queryKey: ['topics'] })
      toast.success('Đã xóa câu')
    },
    onError: () => toast.error('Xóa thất bại'),
  })

  return (
    <div className="group rounded-xl border border-white/10 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm transition-all duration-300 hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/10">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            {phrase.type && (
              <Badge className="bg-violet-500/20 text-xs text-violet-300 border-violet-500/30">
                {phrase.type}
              </Badge>
            )}
            {phrase.structure && (
              <span className="text-xs text-slate-500 font-mono">{phrase.structure}</span>
            )}
          </div>

          {/* Sample sentence */}
          <div className="flex items-center gap-2">
            <h3 className="text-base font-semibold text-white">{phrase.sample_sentence}</h3>
            <button
              onClick={() => speak(phrase.sample_sentence)}
              className="rounded-full p-1 text-slate-500 opacity-0 transition-all group-hover:opacity-100 hover:bg-white/10 hover:text-violet-400"
              title="Nghe phát âm"
            >
              <Volume2 className="h-3.5 w-3.5" />
            </button>
          </div>

          {phrase.pronunciation && (
            <p className="mt-0.5 font-mono text-xs text-slate-500">{phrase.pronunciation}</p>
          )}
          {phrase.translation && (
            <p className="mt-1 text-sm text-slate-400">{phrase.translation}</p>
          )}
          {phrase.function && (
            <p className="mt-1.5 text-xs italic text-slate-500">{phrase.function}</p>
          )}
        </div>

        {/* Actions */}
        <div className="flex shrink-0 items-center gap-1 opacity-0 transition-all group-hover:opacity-100">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-violet-400"
            onClick={() => onEdit(phrase)}
          >
            <Edit2 className="h-3.5 w-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-slate-500 hover:text-red-400"
            onClick={() => {
              if (confirm('Xóa câu này?')) deleteMutation.mutate()
            }}
          >
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </div>
      </div>

      {/* Examples (expandable) */}
      {(phrase.example1 || phrase.example2) && (
        <>
          <div className="border-t border-white/5 px-4 py-2">
            <button
              onClick={() => setExpanded((v) => !v)}
              className="flex w-full items-center justify-between text-xs text-slate-500 hover:text-slate-400"
            >
              <span>Xem ví dụ</span>
              {expanded ? <ChevronUp className="h-3 w-3" /> : <ChevronDown className="h-3 w-3" />}
            </button>
          </div>

          {expanded && (
            <div className="space-y-2 border-t border-white/5 px-4 pb-4 pt-3">
              {[
                {
                  sentence: phrase.example1,
                  translation: phrase.example1_translation,
                  pronunciation: phrase.example1_pronunciation,
                  n: 1,
                },
                {
                  sentence: phrase.example2,
                  translation: phrase.example2_translation,
                  pronunciation: phrase.example2_pronunciation,
                  n: 2,
                },
              ]
                .filter((ex) => ex.sentence)
                .map((ex) => (
                  <div
                    key={ex.n}
                    className="rounded-lg bg-white/5 p-3 text-sm"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="border-slate-600 px-1.5 py-0 text-xs text-slate-500">
                        {ex.n}
                      </Badge>
                      <span className="font-medium text-slate-200">{ex.sentence}</span>
                      <button
                        onClick={() => speak(ex.sentence!)}
                        className="ml-auto text-slate-600 hover:text-violet-400"
                      >
                        <Volume2 className="h-3 w-3" />
                      </button>
                    </div>
                    {ex.pronunciation && (
                      <p className="mt-0.5 pl-7 font-mono text-xs text-slate-500">
                        {ex.pronunciation}
                      </p>
                    )}
                    {ex.translation && (
                      <p className="mt-0.5 pl-7 text-xs text-slate-400">{ex.translation}</p>
                    )}
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </div>
  )
}
