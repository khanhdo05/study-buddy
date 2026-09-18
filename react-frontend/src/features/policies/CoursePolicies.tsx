import { useEffect, useState, type FormEvent } from 'react'
import { errorMessage } from '../../lib/supabase'
import { defaultPolicy, loadPolicy, POLICY_OPTIONS, savePolicy, type CoursePolicy } from './api'
export function CoursePolicies({ courseId, editable }: { courseId: string; editable: boolean }) {
  const [policy, setPolicy] = useState<CoursePolicy | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [saved, setSaved] = useState(false)
  const [revision, setRevision] = useState(0)
  useEffect(() => {
    let active = true
    loadPolicy(courseId).then(value => { if (active) setPolicy(value) }).catch(error => { if (active) setError(errorMessage(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [courseId, revision])
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!policy) return
    setBusy(true); setError(''); setSaved(false)
    try { await savePolicy({ ...policy, topics: lines(policy.topics.join('\n')), objectives: lines(policy.objectives.join('\n')) }); setSaved(true) } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  const lines = (text: string) => text.split('\n').map(line => line.trim()).filter(Boolean)
  return <section className="panel"><h2>Course guidance</h2><p>Approved topics and assistance rules for this course. AI tutoring is not connected yet.</p>
    {error && <div role="alert" className="form-error">{error} <button className="text-button" onClick={() => { setError(''); setLoading(true); setRevision(n => n + 1) }}>Reload</button></div>}
    {loading ? <p role="status">Loading guidance…</p> : !policy ? <><p>No guidance has been saved yet.</p>{editable && !error && <button className="primary" onClick={() => setPolicy(defaultPolicy(courseId))}>Configure guidance</button>}</> : <form onSubmit={submit}><fieldset className="form-fields" disabled={busy || !editable}>
      {POLICY_OPTIONS.map(option => <label className="policy-check" key={option.key}><input type="checkbox" checked={policy[option.key]} onChange={event => { setSaved(false); setPolicy({ ...policy, [option.key]: event.target.checked }) }}/>{option.label}</label>)}
      <label>Approved topics (one per line)<textarea value={policy.topics.join('\n')} onChange={event => { setSaved(false); setPolicy({ ...policy, topics: event.target.value.split('\n') }) }} rows={5}/></label>
      <label>Learning objectives (one per line)<textarea value={policy.objectives.join('\n')} onChange={event => { setSaved(false); setPolicy({ ...policy, objectives: event.target.value.split('\n') }) }} rows={5}/></label>
      <label>Additional instructor guidance<textarea maxLength={5000} value={policy.instructions} onChange={event => { setSaved(false); setPolicy({ ...policy, instructions: event.target.value }) }} rows={4}/></label>
      {editable && <button className="primary">{busy ? 'Saving…' : 'Save course guidance'}</button>}
    </fieldset></form>}{saved && <p className="form-message" role="status">Course guidance saved.</p>}
  </section>
}
