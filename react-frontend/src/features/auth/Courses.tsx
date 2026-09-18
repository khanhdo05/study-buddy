import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { supabase, errorMessage, type Profile, type Course } from '../../lib/supabase'

export function Courses({ session, onSignOut, onDemo }: { session: Session; onSignOut: () => Promise<void>; onDemo: () => void }) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [reload, setReload] = useState(0)
  const [selected, setSelected] = useState<Course | null>(null)
  const [invite, setInvite] = useState('')
  useEffect(() => {
    if (!supabase) return
    let active = true
    const client = supabase
    async function load() {
      try {
        const [profileResult, courseResult] = await Promise.all([
          client.from('profiles').select('id,full_name,role').eq('id', session.user.id).single(),
          client.from('courses').select('id,name,code,owner_id,created_at').order('created_at', { ascending: false }),
        ])
        if (profileResult.error) throw profileResult.error
        if (courseResult.error) throw courseResult.error
        if (active) { setProfile(profileResult.data as Profile); setCourses(courseResult.data as Course[]); setError('') }
      } catch (error) { if (active) setError(errorMessage(error)) }
      finally { if (active) setLoading(false) }
    }
    void load()
    return () => { active = false }
  }, [session.user.id, reload])
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase || busy || !profile) return
    setBusy(true); setError(''); setNotice('')
    try {
      if (profile.role === 'professor') {
        if (!name.trim() || !code.trim()) throw new Error('Enter a course name and code.')
        const { error } = await supabase.from('courses').insert({ name: name.trim(), code: code.trim(), owner_id: session.user.id })
        if (error) throw error
        setName(''); setCode(''); setNotice('Course created. Open it to generate an invitation code.')
      } else {
        const { error } = await supabase.rpc('join_course', { invitation_code: joinCode.trim() })
        if (error) throw error
        setJoinCode(''); setNotice('You joined the course.')
      }
      setReload(n => n + 1)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  async function makeInvite() {
    if (!supabase || !selected || busy) return
    setBusy(true); setError('')
    try {
      const { data, error } = await supabase.rpc('create_course_invite', { target_course: selected.id })
      if (error) throw error
      setInvite(data as string)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  return <div className="courses-workspace"><header className="topbar"><a className="brand" href="/"> <span className="brand-mark">sb<span>·</span></span>study buddy</a><button className="secondary" disabled={busy} onClick={async () => { setBusy(true); try { await onSignOut() } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) } }}>Sign out</button></header><main><div className="page-heading"><div><span className="eyebrow">YOUR WORKSPACE {profile ? ` / ${profile.role.toUpperCase()}` : ''}</span><h1>{profile ? `Welcome, ${profile.full_name}.` : 'Your courses.'}</h1><p>{session.user.email}</p></div><button className="secondary" onClick={onDemo}>Explore sample course ↗</button></div>
    {error && <div className="feedback" role="alert">{error}<p>Check your connection and confirm the database migration has been applied.</p><button className="secondary" onClick={() => { setLoading(true); setReload(n => n + 1) }}>Retry loading</button></div>}{notice && <p className="auth-message" role="status">{notice}</p>}
    {loading ? <p role="status">Loading your courses…</p> : profile && <div className="course-home-grid"><section><div className="section-heading"><h2>Your courses</h2><span className="muted">{courses.length} total</span></div>{courses.length === 0 ? <div className="panel empty-state"><h2>A new chapter starts here.</h2><p>{profile.role === 'professor' ? 'Create your first course to invite students.' : 'Enter the invitation code shared by your professor.'}</p></div> : <div className="course-cards">{courses.map(course => <button className="panel course-card" key={course.id} onClick={() => { setSelected(course); setInvite(''); setNotice('') }}><span className="badge developing">{course.code}</span><h3>{course.name}</h3><span className="muted">{course.owner_id === session.user.id ? 'Your course' : 'Enrolled'} <span aria-hidden="true">→</span></span></button>)}</div>}</section><section className="panel"><h2>{profile.role === 'professor' ? 'Create a course' : 'Join a course'}</h2><form onSubmit={submit}><fieldset className="auth-fields" disabled={busy}>{profile.role === 'professor' ? <><label>Course name<input value={name} onChange={e => setName(e.target.value)} maxLength={150} required placeholder="Introduction to Biology"/></label><label>Course code<input value={code} onChange={e => setCode(e.target.value)} maxLength={30} required placeholder="BIO 101"/></label></> : <label>Invitation code<input value={joinCode} onChange={e => setJoinCode(e.target.value)} maxLength={64} required autoComplete="off" placeholder="Paste your invitation code"/></label>}<button className="primary full">{busy ? 'Please wait…' : profile.role === 'professor' ? 'Create course →' : 'Join course →'}</button></fieldset></form></section></div>}
    {selected && <section className="panel course-details" aria-label="Selected course"><div className="section-heading"><div><span className="eyebrow">{selected.code}</span><h2>{selected.name}</h2></div><button className="text-button" onClick={() => { setSelected(null); setInvite('') }}>Close</button></div><p>This course is saved to your account. Course materials, AI study tools, and graded practice will be connected in the next development step. The sample course remains separate.</p>{selected.owner_id === session.user.id && <><button className="primary" disabled={busy} onClick={makeInvite}>{busy ? 'Creating…' : 'Generate student invitation'}</button>{invite && <div className="feedback" role="status"><label className="invite-label">Invitation code<input readOnly value={invite} onFocus={e => e.target.select()}/></label><p>Share this code with your students. It expires in 7 days. Generating another code invalidates the previous one.</p></div>}</>}</section>}
    </main></div>
}
