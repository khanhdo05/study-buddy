import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

export type FontFamilyOption = 'default' | 'dyslexia'
export type ContrastOption = 'default' | 'high'

type Settings = {
  fontScale: number
  fontFamily: FontFamilyOption
  contrast: ContrastOption
  reduceMotion: boolean
  focusMode: boolean
  darkMode: boolean
}

const DEFAULTS: Settings = {
  fontScale: 1,
  fontFamily: 'default',
  contrast: 'default',
  reduceMotion: false,
  focusMode: false,
  darkMode: false,
}

// eslint-disable-next-line react-refresh/only-export-components -- shared constant lives alongside the provider/hook intentionally
export const FONT_SCALE_STEPS = [1, 1.15, 1.3, 1.5]

const STORAGE_KEY = 'study-buddy-accessibility-v1'

function load(): Settings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULTS
    return { ...DEFAULTS, ...JSON.parse(raw) }
  } catch {
    return DEFAULTS
  }
}

type AccessibilityContextValue = Settings & {
  setFontScale: (scale: number) => void
  setFontFamily: (value: FontFamilyOption) => void
  setContrast: (value: ContrastOption) => void
  setReduceMotion: (value: boolean) => void
  setFocusMode: (value: boolean) => void
  setDarkMode: (value: boolean) => void
  reset: () => void
}

const AccessibilityContext = createContext<AccessibilityContextValue | null>(null)

// Applies settings at the document root so every screen (auth pages, the demo
// workspace, anything added later) picks them up without prop-drilling.
// Persisted so they survive refresh/logout, same as the syllabus/progress state.
export function AccessibilityProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<Settings>(load)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
    } catch {
      /* Private browsing or a full quota — settings just won't persist. */
    }
  }, [settings])

  useEffect(() => {
    const root = document.documentElement
    root.style.setProperty('--a11y-font-scale', String(settings.fontScale))
    root.classList.toggle('a11y-font-dyslexia', settings.fontFamily === 'dyslexia')
    root.classList.toggle('a11y-contrast-high', settings.contrast === 'high')
    root.classList.toggle('a11y-reduce-motion', settings.reduceMotion)
    root.classList.toggle('a11y-dark', settings.darkMode)
  }, [settings.fontScale, settings.fontFamily, settings.contrast, settings.reduceMotion, settings.darkMode])

  const value = useMemo<AccessibilityContextValue>(
    () => ({
      ...settings,
      setFontScale: (scale) => setSettings((s) => ({ ...s, fontScale: scale })),
      setFontFamily: (value) => setSettings((s) => ({ ...s, fontFamily: value })),
      setContrast: (value) => setSettings((s) => ({ ...s, contrast: value })),
      setReduceMotion: (value) => setSettings((s) => ({ ...s, reduceMotion: value })),
      setFocusMode: (value) => setSettings((s) => ({ ...s, focusMode: value })),
      setDarkMode: (value) => setSettings((s) => ({ ...s, darkMode: value })),
      reset: () => setSettings(DEFAULTS),
    }),
    [settings],
  )

  return <AccessibilityContext.Provider value={value}>{children}</AccessibilityContext.Provider>
}

// eslint-disable-next-line react-refresh/only-export-components -- context + hook live together intentionally
export function useAccessibility(): AccessibilityContextValue {
  const ctx = useContext(AccessibilityContext)
  if (!ctx) throw new Error('useAccessibility must be used within AccessibilityProvider')
  return ctx
}
