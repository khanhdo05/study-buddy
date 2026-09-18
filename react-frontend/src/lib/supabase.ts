import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabase = url && key && url !== 'https://your-project.supabase.co'
  ? createClient(url, key)
  : null

export type Profile = { id: string; full_name: string; role: 'student' | 'professor' }
export type Course = { id: string; name: string; code: string; owner_id: string; created_at: string }
export function errorMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message
  return 'Something went wrong. Please try again.'
}

export function requireSupabase() {
  if (!supabase) throw new Error("Supabase is not configured.")
  return supabase
}
