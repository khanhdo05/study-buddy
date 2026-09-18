import './auth.css'
import { useState, type FormEvent } from 'react'
import { supabase, errorMessage } from '../../lib/supabase'

type Mode = 'signin' | 'signup' | 'reset' | 'update'
export function AuthForm({ recovery = false, onRecovered, onDemo }: { recovery?: boolean; onRecovered: () => void; onDemo: () => void }) {
  const [mode, setMode] = useState<Mode>(recovery ? 'update' : 'signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [name, setName] = useState('')
  const [role, setRole] = useState('student')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')
  function changeMode(next: Mode) { setMode(next); setError(''); setMessage(''); setPassword(''); setConfirm('') }
  async function submit(e: FormEvent) {
    e.preventDefault()
    if (!supabase || busy) return
    setError(''); setMessage('')
    if ((mode === 'signup' || mode === 'update') && password !== confirm) { setError('The passwords do not match.'); return }
    if (mode === 'signup' && !name.trim()) { setError('Enter your name.'); return }
    setBusy(true)
    try {
      const redirect = `${window.location.origin}${window.location.pathname}`
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
      } else if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({ email: email.trim(), password, options: { data: { full_name: name.trim(), role }, emailRedirectTo: redirect } })
        if (error) throw error
        if (!data.session) setMessage('Check your email to confirm your account. Then return here to sign in. If you already have an account, sign in or reset your password.')
      } else if (mode === 'reset') {
        const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), { redirectTo: `${redirect}?auth=recovery` })
        if (error) throw error
        setMessage('If an account exists for this email, you’ll receive a password reset link.')
      } else {
        const { error } = await supabase.auth.updateUser({ password })
        if (error) throw error
        onRecovered()
      }
    } catch (error) { setError(errorMessage(error)) }
    finally { setBusy(false) }
  }
  const title = { signin: 'Welcome back.', signup: 'Start your learning journey.', reset: 'Reset your password.', update: 'Choose a new password.' }[mode]
  return <div className="auth-layout"><section className="auth-intro"><a className="brand" href="/"> <span className="brand-mark">sb<span>·</span></span>study buddy</a><span className="eyebrow">A LITTLE PROGRESS, EVERY DAY</span><h1>Built for the way<br/>you learn.</h1><p>A space to ask questions, practice with purpose, and turn small discoveries into lasting understanding.</p><div className="auth-principles"><span>01 &nbsp; Guided by your instructor</span><span>02 &nbsp; Grounded in your course</span><span>03 &nbsp; Focused on your progress</span></div></section><section className="auth-form-wrap"><div className="auth-card"><h2>{title}</h2><p>{mode === 'signup' ? 'One account. A more thoughtful way to study.' : mode === 'update' ? 'Use at least 8 characters for your new password.' : mode === 'reset' ? 'We’ll send you a link to choose a new password.' : 'Sign in to your Study Buddy workspace.'}</p>{!supabase && <div className="feedback" role="status">Authentication is not configured yet. Follow the Supabase setup steps in the frontend README, or explore the sample course below.</div>}
      <form onSubmit={submit}><fieldset disabled={busy || !supabase} className="form-fields">{mode === 'signup' && <><label>Full name<input autoComplete="name" value={name} maxLength={100} onChange={e => setName(e.target.value)} required/></label><label>I’m joining as<select value={role} onChange={e => setRole(e.target.value)}><option value="student">Student</option><option value="professor">Professor</option></select></label></>}{mode !== 'update' && <label>Email<input type="email" autoComplete="email" value={email} onChange={e => setEmail(e.target.value)} required/></label>}{mode !== 'reset' && <label>{mode === 'update' ? 'New password' : 'Password'}<input type="password" autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} minLength={mode === 'signin' ? undefined : 8} value={password} onChange={e => setPassword(e.target.value)} required/></label>}{(mode === 'signup' || mode === 'update') && <label>Confirm password<input type="password" autoComplete="new-password" minLength={8} value={confirm} onChange={e => setConfirm(e.target.value)} required/></label>}<button className="primary full" type="submit">{busy ? 'Please wait…' : { signin: 'Sign in →', signup: 'Create account →', reset: 'Send reset link →', update: 'Save password →' }[mode]}</button></fieldset></form>
      {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="form-message" role="status">{message}</p>}
      {!recovery && <div className="auth-links">{mode === 'signin' ? <><button disabled={busy} className="text-button" onClick={() => changeMode('reset')}>Forgot password?</button><p>New here? <button disabled={busy} className="text-button" onClick={() => changeMode('signup')}>Create an account</button></p></> : <button disabled={busy} className="text-button" onClick={() => changeMode('signin')}>Back to sign in</button>}</div>}
      {!recovery && <button disabled={busy} className="secondary full" onClick={onDemo}>Explore the demo without signing in</button>}
    </div></section></div>
}
