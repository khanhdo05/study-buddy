export type AccessibilityNeed = 'low-vision' | 'dyslexia' | 'adhd' | 'deaf-hoh'

export type StudentProfile = {
  classLevel: string
  accessibilityNeeds: AccessibilityNeed[]
  notes: string
}

export const CLASS_LEVELS = ['Freshman', 'Sophomore', 'Junior', 'Senior', 'Graduate', 'Other'] as const

const DEFAULTS: StudentProfile = {
  classLevel: '',
  accessibilityNeeds: [],
  notes: '',
}

const STORAGE_KEY = 'study-buddy-profile-v1'

// Persisted the same way as syllabus/progress state (see lib/syllabus.ts) —
// survives refresh, logout, and new sessions since it's keyed in
// localStorage rather than component state.
export function loadProfile(): StudentProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

export function saveProfile(profile: StudentProfile): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    /* Private browsing or a full quota — the session still works without persistence. */
  }
}
