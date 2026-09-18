import { useState } from 'react'
import { useAccessibility } from '../../lib/accessibility'
import { CLASS_LEVELS, loadProfile, saveProfile, type AccessibilityNeed, type StudentProfile } from '../../lib/profile'

const NEEDS: Array<{ id: AccessibilityNeed; label: string; description: string }> = [
  { id: 'low-vision', label: 'Low vision', description: 'Turns on larger text and high contrast.' },
  { id: 'dyslexia', label: 'Dyslexia', description: 'Switches to a dyslexia-friendly font.' },
  { id: 'adhd', label: 'ADHD / trouble focusing', description: 'Turns on Focus mode across the app.' },
  { id: 'deaf-hoh', label: 'Deaf or hard of hearing', description: "Noted for later — nothing here relies on sound today." },
]

export function Profile() {
  const [profile, setProfile] = useState<StudentProfile>(loadProfile)
  const { fontScale, setFontScale, setFontFamily, setContrast, setFocusMode } = useAccessibility()

  function update(next: StudentProfile) {
    setProfile(next)
    saveProfile(next)
  }

  function toggleNeed(id: AccessibilityNeed, checked: boolean) {
    update({
      ...profile,
      accessibilityNeeds: checked
        ? [...profile.accessibilityNeeds, id]
        : profile.accessibilityNeeds.filter((need) => need !== id),
    })
    if (!checked) return
    if (id === 'low-vision') {
      setContrast('high')
      if (fontScale < 1.15) setFontScale(1.15)
    }
    if (id === 'dyslexia') setFontFamily('dyslexia')
    if (id === 'adhd') setFocusMode(true)
  }

  return (
    <div className="settings-grid">
      <section className="panel">
        <span className="eyebrow">ABOUT YOU</span>
        <h2>Your profile</h2>
        <p>This travels with you across Study, Practice, and Progress — set it once and it stays, even after you sign out.</p>
        <div className="form-fields">
          <label>
            Class level
            <select value={profile.classLevel} onChange={(e) => update({ ...profile, classLevel: e.target.value })}>
              <option value="">Not set</option>
              {CLASS_LEVELS.map((level) => (
                <option key={level} value={level}>
                  {level}
                </option>
              ))}
            </select>
          </label>
          <label>
            Anything else we should know?
            <textarea
              rows={3}
              value={profile.notes}
              onChange={(e) => update({ ...profile, notes: e.target.value })}
              placeholder="Optional — e.g. preferred pacing, other accommodations"
            />
          </label>
        </div>
      </section>

      <section className="panel">
        <span className="eyebrow">ACCESSIBILITY NEEDS</span>
        <h2>Make this yours.</h2>
        <p>Checking one turns on a matching setting right away. Fine-tune anything further from the Accessibility menu in the top bar.</p>
        {NEEDS.map(({ id, label, description }) => (
          <label className="policy-option" key={id}>
            <div>
              <strong>{label}</strong>
              <span>{description}</span>
            </div>
            <input
              type="checkbox"
              checked={profile.accessibilityNeeds.includes(id)}
              onChange={(e) => toggleNeed(id, e.target.checked)}
            />
          </label>
        ))}
      </section>
    </div>
  )
}
