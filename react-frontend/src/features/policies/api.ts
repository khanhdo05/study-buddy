import { requireSupabase } from '../../lib/supabase'
export type CoursePolicy = {
  course_id: string; hints_first: boolean; require_attempt: boolean; allow_direct_answers: boolean;
  restrict_to_topics: boolean; topics: string[]; objectives: string[]; instructions: string;
}
export function defaultPolicy(courseId: string): CoursePolicy {
  return { course_id: courseId, hints_first: true, require_attempt: true, allow_direct_answers: false, restrict_to_topics: true, topics: [], objectives: [], instructions: '' }
}
export const POLICY_OPTIONS = [
  { key: 'hints_first', label: 'Give hints before explanations' },
  { key: 'require_attempt', label: 'Ask for a student attempt first' },
  { key: 'allow_direct_answers', label: 'Allow direct homework answers' },
  { key: 'restrict_to_topics', label: 'Stay within approved topics' },
] as const
export async function loadPolicy(courseId: string) {
  const { data, error } = await requireSupabase().from('course_policies').select('*').eq('course_id', courseId).maybeSingle()
  if (error) throw error
  return data as CoursePolicy | null
}
export async function savePolicy(policy: CoursePolicy) {
  const { error } = await requireSupabase().from('course_policies').upsert(policy, { onConflict: 'course_id' })
  if (error) throw error
}
