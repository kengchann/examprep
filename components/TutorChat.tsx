'use client'
import { useEffect, useRef, useState } from 'react'

export type TutorContext = {
  question_text: string
  options: string[]
  correct_indices: number[]
  selected_indices: number[]
  topic: string
  explanation: string
}

type Msg = { role: 'user' | 'model'; text: string }

const SUGGESTIONS = [
  'Why is my answer wrong?',
  'Explain the correct answer simply',
  'Give a real-world example',
  'Compare with a similar AWS service',
  'Quiz me until I understand',
]

// A question-scoped AI tutor chat. Opens as a bottom sheet; sends the question
// context + conversation to /api/tutor (Google Gemini) and shows the reply.
export default function TutorChat({ context, onClose }: { context: TutorContext; onClose: () => void }) {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string) {
    const q = text.trim()
    if (!q || loading) return
    setError('')
    const next = [...messages, { role: 'user' as const, text: q }]
    setMessages(next)
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/tutor', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ context, messages: next }),
      })
      const data = await res.json()
      if (!res.ok || data.error) {
        setError(data.error || 'Something went wrong.')
      } else {
        setMessages(m => [...m, { role: 'model', text: data.text }])
      }
    } catch {
      setError('Could not reach the AI tutor. Check your connection.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-[70] flex flex-col justify-end" onClick={onClose}>
      <div className="bg-white rounded-t-3xl w-full max-w-md mx-auto flex flex-col h-[85vh]" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xl">💬</span>
            <div>
              <p className="font-semibold text-gray-800 text-sm leading-tight">AI Study Assistant</p>
              <p className="text-xs text-gray-400 leading-tight">{context.topic || 'This question'}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 text-2xl leading-none">×</button>
        </div>

        {/* Messages */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
          {messages.length === 0 && (
            <div className="text-center text-gray-400 text-sm py-6">
              Ask anything about this question — I&apos;ll help you understand it, not just memorize it.
            </div>
          )}
          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-[85%] px-3.5 py-2.5 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap break-words ${
                m.role === 'user' ? 'bg-brand-600 text-white rounded-br-md' : 'bg-gray-100 text-gray-800 rounded-bl-md'
              }`}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-gray-100 text-gray-500 px-3.5 py-2.5 rounded-2xl rounded-bl-md text-sm">Thinking…</div>
            </div>
          )}
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl px-3 py-2">{error}</div>
          )}
        </div>

        {/* Suggestion chips (only before the first message) */}
        {messages.length === 0 && (
          <div className="px-4 pb-2 flex flex-wrap gap-1.5 flex-shrink-0">
            {SUGGESTIONS.map(s => (
              <button key={s} onClick={() => send(s)}
                className="text-xs border border-brand-200 text-brand-600 rounded-full px-3 py-1.5 active:scale-95">
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="px-3 py-3 border-t border-gray-100 flex items-end gap-2 flex-shrink-0">
          <textarea
            className="flex-1 resize-none rounded-2xl border border-gray-200 px-3 py-2 text-sm max-h-28 focus:outline-none focus:ring-2 focus:ring-brand-200"
            rows={1}
            placeholder="Ask a follow-up…"
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(input) } }}
          />
          <button onClick={() => send(input)} disabled={loading || !input.trim()}
            className="bg-brand-600 text-white rounded-full w-10 h-10 flex items-center justify-center flex-shrink-0 disabled:opacity-40 active:scale-95">
            ↑
          </button>
        </div>
      </div>
    </div>
  )
}
