import { useState } from 'react'
import { errorMessage } from '../lib/supabase'

export function SignOutButton({ onSignOut, onError }: { onSignOut: () => Promise<void>; onError: (message: string) => void }) {
  const [busy, setBusy] = useState(false)
  return <button className="secondary" disabled={busy} onClick={async () => {
    setBusy(true)
    try { await onSignOut() } catch (error) { onError(errorMessage(error)) } finally { setBusy(false) }
  }}>{busy ? 'Signing out…' : 'Sign out'}</button>
}
