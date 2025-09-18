import React, { useEffect, useRef, useState } from 'react'
import { useAuth } from '../lib/auth'

type Message = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export default function GuideChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const listRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight
    }
  }, [messages])

  async function sendMessage() {
    const question = input.trim()
    if (!question || loading) return
    setInput('')
    const localId = crypto.randomUUID()
    setMessages(prev => [...prev, { id: localId, role: 'user', content: question }])
    setLoading(true)

    try {
      const webhook = import.meta.env.VITE_N8N_WEBHOOK_URL as string | undefined
      if (!webhook) {
        throw new Error('Missing VITE_N8N_WEBHOOK_URL')
      }

      const res = await fetch(webhook, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, userId: user?.id || null }),
      })

      if (!res.ok) {
        const text = await res.text()
        throw new Error(`n8n error: ${res.status} ${text}`)
      }

      // Try JSON first, then fallback to raw text, and extract 'answer' field if present
      let reply = ''
      const extractAnswer = (obj: any): string | null => {
        if (!obj || typeof obj !== 'object') return null;
        if (typeof obj.answer === 'string') return obj.answer;
        for (const key of Object.keys(obj)) {
          if (typeof obj[key] === 'object') {
            const found = extractAnswer(obj[key]);
            if (found) return found;
          }
        }
        return null;
      };
      const contentType = res.headers.get('content-type') || ''
      if (contentType.includes('application/json')) {
        const data = await res.json().catch(() => ({}))
        const answer = extractAnswer(data);
        if (answer) {
          reply = answer.replace(/\n/g, ' ');
        } else {
          reply = data.reply || data.message || data.text || JSON.stringify(data)
        }
      } else {
        const text = await res.text()
        try {
          const parsed = JSON.parse(text)
          const answer = extractAnswer(parsed);
          if (answer) {
            reply = answer.replace(/\n/g, ' ');
          } else {
            reply = parsed.reply || parsed.message || parsed.text || JSON.stringify(parsed)
          }
        } catch {
          reply = text
        }
      }

      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: reply || '(no reply)' }])
    } catch (err: any) {
      setMessages(prev => [...prev, { id: crypto.randomUUID(), role: 'assistant', content: `Error: ${err?.message || err}` }])
    } finally {
      setLoading(false)
    }
  }

  return (
    <div>
      <section className="hero">
        <h1>Guide Chat</h1>
        <p className="muted">Ask practical travel guidance. Powered by your n8n workflow.</p>
      </section>

      <div className="card" style={{ padding: 0 }}>
        <div ref={listRef} style={{ maxHeight: 500, overflowY: 'auto', padding: 16 }}>
          {messages.length === 0 && (
            <div className="muted">Start a conversation. Example: "Plan a 2-day trip to Ranchi"</div>
          )}
          {messages.map(m => (
            <div key={m.id} className={m.role === 'user' ? 'message user' : 'message ai'} style={{ marginBottom: 12 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>{m.role === 'user' ? 'You' : 'Guide'}</div>
              <div style={{ whiteSpace: 'pre-wrap' }}>{m.content}</div>
            </div>
          ))}
          {loading && <div className="muted">Thinking...</div>}
        </div>

        <div style={{ display: 'flex', gap: 8, padding: 12, borderTop: '1px solid rgba(255,255,255,0.08)' }}>
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') sendMessage() }}
            placeholder="Type your message..."
            className="input"
            style={{ flex: 1 }}
          />
          <button className="btn primary" onClick={sendMessage} disabled={loading}>Send</button>
        </div>
      </div>

    </div>
  )
}


