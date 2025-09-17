import React, { useState, useEffect, useMemo, useRef } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../lib/auth'

export default function Chat() {
  const { user } = useAuth()
  const userId = useMemo(() => user?.id || '', [user])
  const [prompt, setPrompt] = useState('')
  const [history, setHistory] = useState<any[]>([])
  const [typing, setTyping] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
    })
  }

  async function send() {
    const url = import.meta.env.VITE_SUPABASE_URL as string
    const anon = import.meta.env.VITE_SUPABASE_ANON_KEY as string
    if (!prompt.trim()) return

    // optimistic bubbles in chronological order
    const currentPrompt = prompt
    setPrompt('')
    setTyping(true)
    setHistory(prev => [...prev, { role: 'user', prompt: currentPrompt, gemini_response: '' }])
    // placeholder assistant message
    let assistantIndex = -1
    setHistory(prev => { assistantIndex = prev.length; return [...prev, { role: 'assistant', prompt: currentPrompt, gemini_response: '' }] })
    scrollToBottom()

    const session = await supabase.auth.getSession()
    const access = session.data.session?.access_token || ''
    const r = await fetch(`${url}/functions/v1/chat`, { method:'POST', headers: { 'Content-Type':'application/json', 'Authorization':`Bearer ${access}`, 'apikey': anon }, body: JSON.stringify({ user_id: userId, prompt: currentPrompt }) })
    let reply = ''
    if (r.ok) {
      try { const j = await r.json(); reply = j.response || '' } catch { reply = await r.text() }
    } else { reply = await r.text() }

    await new Promise<void>((resolve) => {
      let i = 0
      const step = Math.max(1, Math.ceil(reply.length / 60))
      const id = setInterval(() => {
        i += step
        const slice = reply.slice(0, i)
        setHistory(prev => prev.map((m, idx) => idx === assistantIndex ? { ...m, gemini_response: slice } : m))
        scrollToBottom()
        if (i >= reply.length) { clearInterval(id); resolve() }
      }, 30)
    })
    setTyping(false)
  }

  async function load() {
    if (!userId) return
    const { data } = await supabase
      .from('chats')
      .select('prompt, gemini_response, timestamp')
      .eq('user_id', userId)
      .order('timestamp', { ascending: true })
      .limit(100)
    const msgs: any[] = []
    ;(data || []).forEach((r: any) => {
      if (r.prompt) msgs.push({ role: 'user', prompt: r.prompt, gemini_response: '' })
      if (r.gemini_response) msgs.push({ role: 'assistant', prompt: r.prompt, gemini_response: r.gemini_response })
    })
    setHistory(msgs)
  }

  useEffect(() => { load() }, [userId])
  useEffect(() => { scrollToBottom() }, [history.length])

  return (
    <div className="container">
      <section className="hero hero-bg">
        <h1 className="title">AI Travel Assistant</h1>
        <p className="subtitle">Get personalized travel recommendations, itinerary planning, and local insights powered by AI</p>
      </section>

      <div className="chat-container">
        <div ref={scrollRef} className="chat-messages">
          {history.length === 0 && (
            <div className="text-center" style={{ margin: 'auto', color: 'var(--text-muted)' }}>
              <h3 style={{ marginBottom: '1rem' }}>👋 Welcome to your AI Travel Assistant!</h3>
              <p>Ask me anything about travel, places to visit, local recommendations, or itinerary planning.</p>
              <div className="chips" style={{ marginTop: '2rem', justifyContent: 'center' }}>
                <div className="chip">"Plan a 3-day trip to Jharkhand"</div>
                <div className="chip">"Best places to visit in Kerala"</div>
                <div className="chip">"Local festivals this month"</div>
                <div className="chip">"Budget travel tips"</div>
              </div>
            </div>
          )}
          
          {history.map((m,i) => (
            <div key={i} className={`message ${m.role}`}>
              <div style={{ whiteSpace:'pre-wrap', lineHeight: '1.6' }}>
                {m.role==='user' ? m.prompt : m.gemini_response}
              </div>
            </div>
          ))}
          
          {typing && (
            <div className="message ai">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <div className="loading" style={{ width: '16px', height: '16px' }}></div>
                <span className="muted">AI is thinking...</span>
              </div>
            </div>
          )}
        </div>
        
        <div className="chat-input">
          <form onSubmit={(e) => { e.preventDefault(); send(); }}>
            <input 
              className="input" 
              value={prompt} 
              onChange={e => setPrompt(e.target.value)} 
              placeholder="Ask me anything about travel..." 
              onKeyDown={(e) => { if (e.key==='Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
              disabled={!userId || typing}
            />
            <button 
              className="btn" 
              type="submit" 
              disabled={!userId || typing || !prompt.trim()}
            >
              {typing ? <span className="loading"></span> : 'Send'}
            </button>
          </form>
        </div>
      </div>
      
      {!userId && (
        <div className="warning text-center" style={{ marginTop: '2rem' }}>
          Please sign in to start chatting with the AI assistant.
        </div>
      )}
    </div>
  )
}


