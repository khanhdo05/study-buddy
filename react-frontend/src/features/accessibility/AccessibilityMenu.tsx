import { useEffect, useRef, useState } from 'react'
import { FONT_SCALE_STEPS, useAccessibility } from '../../lib/accessibility'
import './accessibility.css'

export function AccessibilityMenu() {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const { fontScale, setFontScale, fontFamily, setFontFamily, contrast, setContrast, reduceMotion, setReduceMotion, reset } =
    useAccessibility()

  useEffect(() => {
    if (!open) return
    function onPointerDown(e: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false)
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const scaleIndex = FONT_SCALE_STEPS.indexOf(fontScale)
  const canShrink = scaleIndex > 0
  const canGrow = scaleIndex >= 0 && scaleIndex < FONT_SCALE_STEPS.length - 1

  return (
    <div className="a11y-menu" ref={containerRef}>
      <button
        type="button"
        className="text-button a11y-menu-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        <span aria-hidden="true">◐</span> Accessibility
      </button>
      {open && (
        <div className="a11y-panel" role="dialog" aria-label="Accessibility settings">
          <div className="a11y-panel-row">
            <div>
              <strong>Text size</strong>
              <span className="muted"> {Math.round(fontScale * 100)}%</span>
            </div>
            <div className="a11y-stepper">
              <button
                type="button"
                aria-label="Decrease text size"
                disabled={!canShrink}
                onClick={() => setFontScale(FONT_SCALE_STEPS[Math.max(scaleIndex - 1, 0)])}
              >
                A−
              </button>
              <button
                type="button"
                aria-label="Increase text size"
                disabled={!canGrow}
                onClick={() => setFontScale(FONT_SCALE_STEPS[Math.min(scaleIndex + 1, FONT_SCALE_STEPS.length - 1)])}
              >
                A+
              </button>
            </div>
          </div>

          <label className="policy-option">
            <div>
              <strong>Dyslexia-friendly font</strong>
              <span>Atkinson Hyperlegible, with extra letter spacing</span>
            </div>
            <input
              type="checkbox"
              checked={fontFamily === 'dyslexia'}
              onChange={(e) => setFontFamily(e.target.checked ? 'dyslexia' : 'default')}
            />
          </label>

          <label className="policy-option">
            <div>
              <strong>High contrast</strong>
              <span>Darker text and borders</span>
            </div>
            <input
              type="checkbox"
              checked={contrast === 'high'}
              onChange={(e) => setContrast(e.target.checked ? 'high' : 'default')}
            />
          </label>

          <label className="policy-option">
            <div>
              <strong>Reduce motion</strong>
              <span>Turn off transitions and animation</span>
            </div>
            <input type="checkbox" checked={reduceMotion} onChange={(e) => setReduceMotion(e.target.checked)} />
          </label>

          <div className="a11y-panel-footer">
            <button type="button" className="text-button" onClick={reset}>
              Reset to defaults
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
