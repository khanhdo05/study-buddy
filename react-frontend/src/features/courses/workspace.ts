import type { Course } from '../../lib/supabase'

export type CourseRole = 'owner' | 'student'
export const COURSE_PAGES = [
  { id: 'overview', label: 'Overview', icon: '◫' },
  { id: 'materials', label: 'Materials', icon: '▥' },
  { id: 'study', label: 'Study', icon: '✧' },
  { id: 'practice', label: 'Practice', icon: '▤' },
  { id: 'progress', label: 'Progress', icon: '↗' },
  { id: 'settings', label: 'Course settings', icon: '⚙', ownerOnly: true },
] as const
export type CoursePage = typeof COURSE_PAGES[number]['id']
export const ROLE_LABELS: Record<CourseRole, string> = { owner: 'Professor · course owner', student: 'Enrolled student' }

// Only call with a course returned by the RLS-protected query. The database,
// not this presentation helper, decides whether the user may access a course.
export function courseRole(course: Course, userId: string): CourseRole {
  return course.owner_id === userId ? 'owner' : 'student'
}
export function courseNavigation(role: CourseRole) {
  return COURSE_PAGES.filter(page => !('ownerOnly' in page) || role === 'owner')
}
export function allowedCoursePage(value: string | null, role: CourseRole): CoursePage {
  return courseNavigation(role).find(page => page.id === value)?.id ?? 'overview'
}

export const EMPTY_COURSE_CONTENT = {
  materials: {
    owner: { title: 'Your course library starts here.', description: 'Document uploads are not connected to this workspace yet. Your students will see materials here once publishing is available.' },
    student: { title: 'No course materials available yet.', description: 'Published course materials will appear here when your instructor shares them.' },
  },
  study: { title: 'Your course companion is on its way.', description: 'Course-aware chat will be available after materials and AI assistance are connected. No sample answers are used for this course.' },
  practice: { title: 'No practice questions available yet.', description: 'Practice will use concepts from this course once question generation is connected.' },
  progress: { title: 'Your learning history starts here.', description: 'No practice has been recorded for this course. Progress will appear when course practice is available.' },
} as const
