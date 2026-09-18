import { requireSupabase, type Course, type Profile } from '../../lib/supabase'

const COURSE_FIELDS = 'id,name,code,owner_id,created_at'

export async function loadCourseHome(userId: string): Promise<{ profile: Profile; courses: Course[] }> {
  const db = requireSupabase()
  const [profile, courses] = await Promise.all([
    db.from('profiles').select('id,full_name,role').eq('id', userId).single(),
    db.from('courses').select(COURSE_FIELDS).order('created_at', { ascending: false }),
  ])
  if (profile.error) throw profile.error
  if (courses.error) throw courses.error
  return { profile: profile.data as Profile, courses: courses.data as Course[] }
}

export async function createCourse(userId: string, name: string, code: string): Promise<Course> {
  if (!name.trim() || !code.trim()) throw new Error('Enter a course name and code.')
  const { data, error } = await requireSupabase().from('courses').insert({ owner_id: userId, name: name.trim(), code: code.trim() }).select(COURSE_FIELDS).single()
  if (error) throw error
  return data as Course
}

export async function joinCourse(code: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('join_course', { invitation_code: code.trim() })
  if (error) throw error
  return data as string
}

export async function createInvitation(courseId: string): Promise<string> {
  const { data, error } = await requireSupabase().rpc('create_course_invite', { target_course: courseId })
  if (error) throw error
  return data as string
}
