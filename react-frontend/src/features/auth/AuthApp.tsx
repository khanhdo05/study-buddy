import { useEffect, useState } from 'react'
import type { Session } from '@supabase/supabase-js'
import App from '../../App'
import { supabase, errorMessage } from '../../lib/supabase'
import { AuthForm } from './AuthForm'
import { Courses } from './Courses'
import './auth.css'

export function AuthApp() {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(Boolean(supabase))
  const [demo, setDemo] = useState(false)
  const [recovery, setRecovery] = useState(() => new URLSearchParams(window.location.search).get('auth') === 'recovery' || new URLSearchParams(window.location.hash.slice(1)).get('type') === 'recovery')
  const [error, setError] = useState(() => new URLSearchParams(window.location.hash.slice(1)).get('error_description') || '')
  useEffect(() => {
    if (!supabase) return
    let active = true
    let eventReceived = false
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, next) => {
      if (!active) return
      eventReceived = true
      setSession(next); setLoading(false)
      if (event === 'PASSWORD_RECOVERY') setRecovery(true)
      if (event === 'SIGNED_OUT') { setDemo(false); setRecovery(false) }
    })
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!active) return
      if (error) setError(error.message)
      if (!eventReceived) setSession(data.session)
      setLoading(false)
    }).catch(error => { if (active) { setError(errorMessage(error)); setLoading(false) } })
    return () => { active = false; subscription.unsubscribe() }
  }, [])
  async function signOut() {
    if (!supabase) return
    const { error } = await supabase.auth.signOut()
    if (error) throw error
    setSession(null); setDemo(false)
  }
  if (loading) return <div className="auth-loading" role="status">Opening your workspace…</div>
  if (demo && !recovery) return <><div className="demo-exit"><span>Sample course · separate from your account</span><button className="text-button" onClick={() => setDemo(false)}>{session ? 'Back to my courses' : 'Back to sign in'} →</button></div><App/></>
  return <>{error && <div className="auth-global-error" role="alert">{error}<button className="text-button" onClick={() => setError('')}>Dismiss</button></div>}{recovery ? session ? <AuthForm key="recovery" recovery onDemo={() => setDemo(true)} onRecovered={() => { setRecovery(false); window.history.replaceState({}, '', window.location.pathname) }}/> : <div className="auth-loading"><h1>Reset link unavailable</h1><p>Your link may have expired. Request a new one from the sign-in screen.</p><button className="primary" onClick={() => { setRecovery(false); window.history.replaceState({}, '', window.location.pathname) }}>Back to sign in</button></div> : session ? <Courses key={session.user.id} session={session} onSignOut={signOut} onDemo={() => setDemo(true)}/> : <AuthForm key="signin" onDemo={() => setDemo(true)} onRecovered={() => setRecovery(false)}/>}</>
}
