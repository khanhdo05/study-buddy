import { useEffect, useState } from 'react'
import type { CoursePage } from './workspace'

function readLocation() {
  const params = new URLSearchParams(window.location.search)
  return { courseId: params.get('course'), page: params.get('view') }
}

// Course URLs survive refresh and browser Back without storing account data.
export function useCourseLocation() {
  const [location, setLocation] = useState(readLocation)
  useEffect(() => {
    const sync = () => setLocation(readLocation())
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [])
  function navigate(courseId: string | null, page: CoursePage = 'overview') {
    const url = new URL(window.location.href)
    if (courseId) { url.searchParams.set('course', courseId); url.searchParams.set('view', page) }
    else { url.searchParams.delete('course'); url.searchParams.delete('view') }
    window.history.pushState({}, '', url)
    setLocation(readLocation())
  }
  return { ...location, navigate }
}
