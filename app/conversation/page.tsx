'use client'

import { useState, useEffect, useRef, useCallback, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import {
  ArrowLeft, Send, Loader2, Volume2, Bot, User, RefreshCcw, Lightbulb,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { apiFetch } from '@/lib/api-client'
import { speak } from '@/lib/tts'
import { toast } from 'sonner'
import type { ConversationMessage } from '@/app/api/conversation/route'

/* ─── Starter prompts per topic ──────────────────────────── */
const STARTER_PROMPTS = [
  'Can you start the conversation?',
  'Hi! Let\'s practice together.',
  'Hello! What should we talk about?',
]

/* ─── Message bubble ─────────────────────────────────────── */
function MessageBubble({ msg, isLast }: { msg: ConversationMessage; isLast: boolean }) {
  const isAI = msg.role === 'assistant'

  return (
    <div className={cn('flex gap-3 items-end', !isAI && 'flex-row-reverse')}>
      {/* Avatar */}
      <div className={cn(
        'shrink-0 flex h-7 w-7 items-center justify-center rounded-full text-white mb-0.5',
        isAI ? 'bg-[#171717] dark:bg-[#f5f5f5] dark:text-[#171717]' : 'bg-blue-500'
      )}>
        {isAI ? <Bot className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
      </div>

      {/* Bubble */}
      <div className={cn(
        'max-w-[78%] rounded-[14px] px-4 py-2.5 text-[14px] leading-relaxed',
        isAI
          ? 'bg-white dark:bg-[#1a1a1a] text-[#171717] dark:text-[#f5f5f5] rounded-bl-[4px]'
          : 'bg-blue-500 text-white rounded-br-[4px]',
      )} style={isAI ? { boxShadow: 'var(--shadow-card)' } : undefined}>
        <p>{msg.content}</p>
        {isAI && isLast && (
          <button
            onClick={() => speak(msg.content)}
            className="mt-1.5 flex items-center gap-1 text-[11px] text-[#999] hover:text-[#666] dark:hover:text-[#aaa] transition-colors"
          >
            <Volume2 className="h-3 w-3" /> Nghe lại
          </button>
        )}
      </div>
    </div>
  )
}

/* ─── Suggestion chip ────────────────────────────────────── */
function SuggestionChip({ text, onClick }: { text: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-3 py-1.5 text-[12px] font-medium text-[#666] dark:text-[#aaa] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors shrink-0"
      style={{ boxShadow: 'var(--shadow-border)' }}
    >
      {text}
    </button>
  )
}

/* ─── Main page ──────────────────────────────────────────── */
function ConversationContent() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const topicId      = searchParams.get('topic_id')

  const [topicName, setTopicName]   = useState('English Conversation')
  const [context, setContext]       = useState('')    // sample sentences to ground AI
  const [messages, setMessages]     = useState<ConversationMessage[]>([])
  const [input, setInput]           = useState('')
  const [loading, setLoading]       = useState(false)
  const [loadingTopic, setLoadingTopic] = useState(!!topicId)
  const [suggestions, setSuggestions] = useState<string[]>([])

  const bottomRef  = useRef<HTMLDivElement>(null)
  const inputRef   = useRef<HTMLTextAreaElement>(null)

  /* Load topic name + sample sentences for context */
  useEffect(() => {
    if (!topicId) { setLoadingTopic(false); return }
    Promise.all([
      apiFetch<{ name: string }>(`/api/topics/${topicId}`).catch(() => null),
      apiFetch<Array<{ sample_sentence: string; translation: string }>>(`/api/phrases?topic_id=${topicId}&limit=8`).catch(() => null),
    ]).then(([topic, phrases]) => {
      if (topic?.name) setTopicName(topic.name)
      if (phrases && phrases.length > 0) {
        const ctx = phrases
          .slice(0, 6)
          .map(p => `- "${p.sample_sentence}" → ${p.translation}`)
          .join('\n')
        setContext(ctx)
      }
    }).finally(() => setLoadingTopic(false))
  }, [topicId])

  /* Auto-scroll */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, loading])

  /* Generate suggestions after each AI reply */
  useEffect(() => {
    if (messages.length === 0) {
      setSuggestions(STARTER_PROMPTS)
      return
    }
    const lastAI = [...messages].reverse().find(m => m.role === 'assistant')
    if (!lastAI) return
    // Simple contextual suggestions
    const base = [
      'Can you repeat that?',
      'Tell me more.',
      'How do I say that differently?',
      'Give me an example.',
    ]
    setSuggestions(base)
  }, [messages])

  const sendMessage = useCallback(async (text: string) => {
    const trimmed = text.trim()
    if (!trimmed || loading) return

    const userMsg: ConversationMessage = { role: 'user', content: trimmed }
    const next = [...messages, userMsg]
    setMessages(next)
    setInput('')
    setSuggestions([])
    setLoading(true)

    try {
      const res = await apiFetch<{ reply: string }>('/api/conversation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: next,
          topicName,
          topicContext: context,
        }),
      })
      const aiMsg: ConversationMessage = { role: 'assistant', content: res.reply }
      setMessages(prev => [...prev, aiMsg])
      speak(res.reply)
    } catch {
      toast.error('Không thể kết nối AI. Kiểm tra kết nối mạng.')
    } finally {
      setLoading(false)
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [messages, topicName, context, loading])

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  function resetConversation() {
    setMessages([])
    setInput('')
    setSuggestions(STARTER_PROMPTS)
    toast('Đã bắt đầu hội thoại mới')
  }

  if (loadingTopic) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-white dark:bg-[#0a0a0a]">
        <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
      </div>
    )
  }

  return (
    <div className="flex flex-col h-screen bg-[#f9f9f9] dark:bg-[#0a0a0a]">

      {/* ── Header ── */}
      <header
        className="shrink-0 bg-white dark:bg-[#0a0a0a] z-10"
        style={{ boxShadow: 'var(--shadow-nav-bottom)' }}
      >
        <div className="mx-auto max-w-2xl px-4 h-14 flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="flex items-center gap-1.5 text-[13px] text-[#666] hover:text-[#171717] dark:hover:text-[#f5f5f5] transition-colors shrink-0"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Quay lại
          </button>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-full bg-[#171717] dark:bg-[#f5f5f5]">
                <Bot className="h-3 w-3 text-white dark:text-[#171717]" />
              </div>
              <div className="min-w-0">
                <p className="text-[13px] font-semibold text-[#171717] dark:text-[#f5f5f5] truncate">
                  Alex · {topicName}
                </p>
                <p className="text-[11px] text-emerald-500 font-medium leading-none">Đang trực tuyến</p>
              </div>
            </div>
          </div>

          <button
            onClick={resetConversation}
            title="Bắt đầu lại"
            className="p-1.5 text-[#bbb] hover:text-[#666] dark:hover:text-[#aaa] transition-colors"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
          </button>
        </div>
      </header>

      {/* ── Message list ── */}
      <main className="flex-1 overflow-y-auto px-4 py-6">
        <div className="mx-auto max-w-2xl space-y-4">

          {/* Welcome / empty state */}
          {messages.length === 0 && (
            <div className="flex flex-col items-center text-center gap-3 py-10">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[#171717] dark:bg-[#f5f5f5]">
                <Bot className="h-7 w-7 text-white dark:text-[#171717]" />
              </div>
              <div>
                <p className="text-[16px] font-semibold text-[#171717] dark:text-[#f5f5f5]">
                  Xin chào! Tôi là Alex 👋
                </p>
                <p className="text-[13px] text-[#999] mt-1 max-w-xs">
                  Hãy cùng luyện nói tiếng Anh về chủ đề <strong className="text-[#171717] dark:text-[#f5f5f5]">{topicName}</strong>.
                  Bắt đầu bằng cách nhắn tin nhé!
                </p>
              </div>
              <div className="flex items-center gap-1.5 text-[11px] text-[#bbb]">
                <Lightbulb className="h-3 w-3" />
                <span>AI sẽ tự động sửa lỗi ngữ pháp cho bạn</span>
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <MessageBubble
              key={i}
              msg={msg}
              isLast={i === messages.length - 1 && msg.role === 'assistant'}
            />
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="flex gap-3 items-end">
              <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#171717] dark:bg-[#f5f5f5]">
                <Bot className="h-3.5 w-3.5 text-white dark:text-[#171717]" />
              </div>
              <div
                className="rounded-[14px] rounded-bl-[4px] px-4 py-3 bg-white dark:bg-[#1a1a1a]"
                style={{ boxShadow: 'var(--shadow-card)' }}
              >
                <div className="flex gap-1 items-center h-4">
                  <span className="h-1.5 w-1.5 rounded-full bg-[#bbb] animate-bounce [animation-delay:0ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#bbb] animate-bounce [animation-delay:150ms]" />
                  <span className="h-1.5 w-1.5 rounded-full bg-[#bbb] animate-bounce [animation-delay:300ms]" />
                </div>
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </main>

      {/* ── Input area ── */}
      <div className="shrink-0 bg-white dark:bg-[#0a0a0a] border-t border-[#f0f0f0] dark:border-[#1a1a1a]">
        <div className="mx-auto max-w-2xl px-4 py-3 space-y-2">

          {/* Suggestions */}
          {suggestions.length > 0 && !loading && (
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {suggestions.map((s, i) => (
                <SuggestionChip key={i} text={s} onClick={() => sendMessage(s)} />
              ))}
            </div>
          )}

          {/* Input row */}
          <div className="flex gap-2 items-end">
            <textarea
              ref={inputRef}
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Gõ tiếng Anh... (Enter để gửi)"
              rows={1}
              disabled={loading}
              className={cn(
                'flex-1 resize-none rounded-[12px] px-4 py-2.5 text-[14px] text-[#171717] dark:text-[#f5f5f5]',
                'bg-[#f5f5f5] dark:bg-[#111] placeholder:text-[#bbb] outline-none',
                'leading-relaxed max-h-32 overflow-y-auto transition-opacity',
                loading && 'opacity-50',
              )}
              style={{ minHeight: '42px' }}
              onInput={e => {
                const el = e.currentTarget
                el.style.height = 'auto'
                el.style.height = `${Math.min(el.scrollHeight, 128)}px`
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className={cn(
                'shrink-0 flex h-10 w-10 items-center justify-center rounded-full transition-all',
                input.trim() && !loading
                  ? 'bg-[#171717] dark:bg-[#f5f5f5] text-white dark:text-[#171717] hover:opacity-90'
                  : 'bg-[#f0f0f0] dark:bg-[#222] text-[#bbb] cursor-not-allowed',
              )}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            </button>
          </div>

          <p className="text-[10px] text-[#bbb] text-center">
            Shift+Enter xuống dòng · Alex sẽ sửa lỗi ngữ pháp tự nhiên
          </p>
        </div>
      </div>

    </div>
  )
}

export default function ConversationPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-[#666]" />
      </div>
    }>
      <ConversationContent />
    </Suspense>
  )
}
