import { useState } from 'react'
import { Brand } from '../../components/Brand'
import { EmptyState } from '../../components/EmptyState'
import { SignOutButton } from '../../components/SignOutButton'
import type { Course, Profile } from '../../lib/supabase'
import { CourseMaterials } from '../materials/CourseMaterials'
import { CoursePolicies } from '../policies/CoursePolicies'
import { CourseStudy } from '../study/CourseStudy'
import { CourseInvitation } from './CourseInvitation'
import { allowedCoursePage, courseNavigation, courseRole, EMPTY_COURSE_CONTENT, ROLE_LABELS, type CoursePage } from './workspace'

type Props = {
  course: Course
  profile: Profile
  requestedPage: string | null
  onNavigate: (page: CoursePage) => void
  onBack: () => void
  onSignOut: () => Promise<void>
}

export function CourseWorkspace({ course, profile, requestedPage, onNavigate, onBack, onSignOut }: Props) {
  const [error, setError] = useState('')
  const role = courseRole(course, profile.id)
  const navigation = courseNavigation(role)
  const page = allowedCoursePage(requestedPage, role)
  const current = navigation.find(item => item.id === page)!
  const initials = profile.full_name.split(/\s+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase()
  const emptyContent = page === 'study' || page === 'practice' || page === 'progress' ? EMPTY_COURSE_CONTENT[page] : null

  return <div className="app real-course"><a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar"><Brand onClick={onBack}/><div className="workspace-label">YOUR COURSE</div>
      <nav aria-label="Course navigation">{navigation.map(item => <button key={item.id} className={`nav-item ${page === item.id ? 'active' : ''}`} aria-current={page === item.id ? 'page' : undefined} onClick={() => onNavigate(item.id)}><span aria-hidden="true">{item.icon}</span>{item.label}</button>)}</nav>
      <div className="sidebar-course"><span className="eyebrow">CURRENT COURSE</span><strong>{course.name}</strong><span>{course.code}</span></div>
      <div className="sidebar-bottom"><button className="text-button" onClick={onBack}>← All courses</button><div className="profile"><span className="avatar" aria-hidden="true">{initials}</span><div><strong>{profile.full_name}</strong><small>{ROLE_LABELS[role]}</small></div></div></div>
    </aside>
    <div className="workspace"><header className="topbar"><div className="course-breadcrumb"><button className="text-button" onClick={onBack}>My courses</button><span className="slash">/</span><strong>{course.code}</strong></div><SignOutButton onSignOut={onSignOut} onError={setError}/></header>
      <main id="main"><div className="page-heading"><div><span className="eyebrow">{course.code} / {current.label.toUpperCase()}</span><h1>{page === 'overview' ? course.name : current.label}</h1><p>{role === 'owner' ? 'Your course workspace' : `Learning in ${course.name}`}</p></div><span className="badge developing">{ROLE_LABELS[role]}</span></div>
        {error && <p className="form-error" role="alert">{error}</p>}
        {page === 'overview' && <><section className="panel course-summary"><h2>{role === 'owner' ? 'Bring your class together.' : 'You’re in the right place.'}</h2><p>{role === 'owner' ? 'Your course is ready for students to join. Share an invitation to get started.' : 'You are enrolled in this course. Your instructor’s materials and learning activities will appear in this workspace.'}</p><dl><div><dt>Course name</dt><dd>{course.name}</dd></div><div><dt>Course code</dt><dd>{course.code}</dd></div><div><dt>Your access</dt><dd>{ROLE_LABELS[role]}</dd></div></dl></section><div className="course-cards workspace-links">{navigation.filter(item => item.id !== 'overview').map(item => <button key={item.id} className="panel course-card" onClick={() => onNavigate(item.id)}><span aria-hidden="true">{item.icon}</span><h3>{item.label}</h3><span className="muted">Open {item.label.toLowerCase()} →</span></button>)}</div></>}
        {page === 'materials' && <CourseMaterials key={course.id} courseId={course.id} editable={role === 'owner'}/>}
        {page === 'overview' && <CoursePolicies key={course.id} courseId={course.id} editable={false}/>}
        {page === 'study' && <CourseStudy courseId={course.id}/>}
        {emptyContent && page !== 'study' && <EmptyState {...emptyContent}/>}
        {page === 'settings' && role === 'owner' && <div className="course-settings"><CourseInvitation key={course.id} courseId={course.id}/><CoursePolicies key={course.id} courseId={course.id} editable/></div>}
      </main>
    </div>
  </div>
}
