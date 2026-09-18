import './courses.css'
import { useEffect, useState, type FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import { Brand } from '../../components/Brand'
import { EmptyState } from '../../components/EmptyState'
import { SignOutButton } from '../../components/SignOutButton'
import { errorMessage, type Profile, type Course } from '../../lib/supabase'
import { createCourse, joinCourse, loadCourseHome } from './api'
import { CourseWorkspace } from './CourseWorkspace'
import { useCourseLocation } from './useCourseLocation'

type Props = { session: Session; onSignOut: () => Promise<void>; onDemo: () => void }

export function Courses({ session, onSignOut, onDemo }: Props) {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [courses, setCourses] = useState<Course[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState('')
  const [error, setError] = useState('')
  const [name, setName] = useState('')
  const [code, setCode] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [reload, setReload] = useState(0)
  const { courseId, page, navigate } = useCourseLocation()

  useEffect(() => {
    let active = true
    void loadCourseHome(session.user.id).then(result => {
      if (active) { setProfile(result.profile); setCourses(result.courses); setLoadError('') }
    }).catch(error => { if (active) setLoadError(errorMessage(error)) })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [session.user.id, reload])

  function retry() { setLoading(true); setReload(value => value + 1) }
  async function submit(event: FormEvent) {
    event.preventDefault()
    if (busy || !profile) return
    setBusy(true); setError('')
    try {
      const id = profile.role === 'professor'
        ? (await createCourse(session.user.id, name, code)).id
        : await joinCourse(joinCode)
      setName(''); setCode(''); setJoinCode('')
      // Reload through RLS before displaying the newly created/joined course.
      retry()
      navigate(id)
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const selected = courses.find(course => course.id === courseId)
  if (!loading && !loadError && profile && selected) {
    return <CourseWorkspace key={`${profile.id}:${selected.id}`} course={selected} profile={profile} requestedPage={page} onNavigate={next => navigate(selected.id, next)} onBack={() => navigate(null)} onSignOut={onSignOut}/>
  }

  return <div className="courses-workspace"><header className="topbar"><Brand onClick={() => navigate(null)}/><SignOutButton onSignOut={onSignOut} onError={setError}/></header><main>
    <div className="page-heading"><div><span className="eyebrow">YOUR WORKSPACE {profile ? ` / ${profile.role.toUpperCase()}` : ''}</span><h1>{profile ? `Welcome, ${profile.full_name}.` : 'Your courses.'}</h1><p>{session.user.email}</p></div><button className="secondary" onClick={onDemo}>Explore sample course ↗</button></div>
    {error && <p className="form-error" role="alert">{error}</p>}
    {loading ? <p role="status">Loading your courses…</p> : loadError ? <section className="feedback" role="alert"><p>{loadError}</p><p>Check your connection and confirm the database migration has been applied.</p><button className="secondary" onClick={retry}>Retry loading</button></section> : courseId && !selected ? <EmptyState title="Course unavailable" description="This course does not exist or you do not have access to it."><button className="primary" onClick={() => navigate(null)}>Back to my courses</button></EmptyState> : profile && <div className="course-home-grid"><section><div className="section-heading"><h2>Your courses</h2><span className="muted">{courses.length} total</span></div>
      {courses.length === 0 ? <EmptyState title="A new chapter starts here." description={profile.role === 'professor' ? 'Create your first course to invite students.' : 'Enter the invitation code shared by your professor.'}/> : <div className="course-cards">{courses.map(course => <button className="panel course-card" key={course.id} onClick={() => navigate(course.id)}><span className="badge developing">{course.code}</span><h3>{course.name}</h3><span className="muted">{course.owner_id === session.user.id ? 'Your course' : 'Enrolled'} <span aria-hidden="true">→</span></span></button>)}</div>}
    </section><section className="panel"><h2>{profile.role === 'professor' ? 'Create a course' : 'Join a course'}</h2><form onSubmit={submit}><fieldset className="form-fields" disabled={busy}>{profile.role === 'professor' ? <><label>Course name<input value={name} onChange={event => setName(event.target.value)} maxLength={150} required placeholder="Introduction to Biology"/></label><label>Course code<input value={code} onChange={event => setCode(event.target.value)} maxLength={30} required placeholder="BIO 101"/></label></> : <label>Invitation code<input value={joinCode} onChange={event => setJoinCode(event.target.value)} maxLength={64} required autoComplete="off" placeholder="Paste your invitation code"/></label>}<button className="primary full">{busy ? 'Please wait…' : profile.role === 'professor' ? 'Create course →' : 'Join course →'}</button></fieldset></form></section></div>}
  </main></div>
}
