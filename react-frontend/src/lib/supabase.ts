import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL?.trim()
const key = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY?.trim()

export const supabase = url && key && url !== 'https://your-project.supabase.co'
  ? createClient(url, key)
  : null

export type Profile = { id: string; full_name: string; role: 'student' | 'professor' }
export type Course = { id: string; name: string; code: string; owner_id: string; created_at: string }
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Something went wrong. Please try again.'
}
