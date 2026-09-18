import { useState } from 'react'
import { errorMessage } from '../../lib/supabase'
import { createInvitation } from './api'

export function CourseInvitation({ courseId }: { courseId: string }) {
  const [invite, setInvite] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  async function generate() {
    setBusy(true); setError('')
    try { setInvite(await createInvitation(courseId)) }
    catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <section className="panel"><h2>Invite your students</h2><p>Give students a code to join this course from their own accounts.</p>
    <button className="primary" disabled={busy} onClick={generate}>{busy ? 'Creating invitation…' : invite ? 'Replace invitation code' : 'Generate student invitation'}</button>
    {error && <p className="form-error" role="alert">{error}</p>}
    {invite && <div className="feedback" role="status"><label className="invite-label">Invitation code<input readOnly value={invite} onFocus={event => event.target.select()}/></label><p>Share this code with your students. It expires in 7 days. Generating another code invalidates the previous one.</p></div>}
  </section>
}
