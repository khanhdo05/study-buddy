import { useState, type FormEvent } from 'react'
import { requireSupabase } from '../../lib/supabase'

type Message = { role: 'user' | 'assistant'; text: string }

export function CourseStudy({ courseId }: { courseId: string }) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [attempt, setAttempt] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function send(event: FormEvent) {
    event.preventDefault()
    const message = input.trim()
    if (!message || busy) return
    setBusy(true); setError('')
    const next = [...messages, { role: 'user' as const, text: message }]
    setMessages(next); setInput('')
    try {
      const { data, error: sessionError } = await requireSupabase().auth.getSession()
      if (sessionError || !data.session) throw new Error('Your session expired. Sign in again.')
      const api = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
      const response = await fetch(`${api}/courses/${courseId}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${data.session.access_token}` },
        body: JSON.stringify({ message, attempt: attempt.trim() || null, history: next.slice(-8) }), signal: AbortSignal.timeout(90000),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.detail || 'The study service could not answer.')
      setMessages([...next, { role: 'assistant', text: result.answer }])
    } catch (error) {
      setMessages(messages); setError(error instanceof Error ? error.message : 'The study service could not answer.')
    } finally { setBusy(false) }
  }
  return <div className="study-layout"><section className="panel chat"><div className="section-heading"><div className="chat-title"><span className="assistant-icon">✧</span><div><h2>Your course companion</h2><small>Grounded in published course materials</small></div></div><span className="badge developing">Live AI</span></div>
    <div className="messages" role="log" aria-live="polite">{messages.length === 0 && <p className="muted">Ask a question about this course. The assistant will use published material and the instructor’s saved guidance.</p>}{messages.map((item, index) => <div className={`message ${item.role}`} key={index}><span className="eyebrow">{item.role === 'user' ? 'YOU' : 'STUDY BUDDY'}</span><p>{item.text}</p></div>)}</div>
    {error && <p className="form-error" role="alert">{error}</p>}
    <label className="attempt-field">Your attempt (required when instructor guidance asks for one)<textarea rows={3} value={attempt} onChange={event => setAttempt(event.target.value)} placeholder="What have you tried so far?"/></label>
    <form className="composer" onSubmit={send}><label className="sr-only" htmlFor="course-question">Ask a course question</label><input id="course-question" value={input} onChange={event => setInput(event.target.value)} placeholder="What would you like to understand?" maxLength={4000}/><button className="primary" disabled={busy || !input.trim()} type="submit">{busy ? '…' : '↑'}</button></form><small className="chat-disclaimer">Live response from your Study Buddy backend · evidence and course policy are applied server-side</small>
  </section><aside><section className="scope-card"><span className="eyebrow">COURSE-GROUNDED</span><h3>Published material only.</h3><p>The backend checks your course access and sends only published material to the model.</p><hr/><p>Instructor guidance is enforced before the model sees your question.</p></section></aside></div>
}
