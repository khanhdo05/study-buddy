import { useEffect, useRef, useState } from 'react';
import { Brand } from '../components/Brand';
import { applyResult, initialConcepts, status, type Concept, type MissRating } from '../lib/demo';
import { loadSyllabusInfo, saveSyllabusInfo, type SyllabusInfo } from '../lib/syllabus';
import { useAccessibility } from '../lib/accessibility';
import { Practice } from '../features/practice/Practice';
import { Study } from '../features/study/Study';
import { Materials } from '../features/materials/Materials';
import { ConceptList } from '../features/progress/ConceptList';
import { AccessibilityMenu } from '../features/accessibility/AccessibilityMenu';
import { Profile } from '../features/profile/Profile';
type Page = 'Overview' | 'Study' | 'Practice' | 'Progress' | 'Materials' | 'Profile' | 'Course settings';
const nav: {
  page: Page;
  icon: string;
}[] = [{
  page: 'Overview',
  icon: '◫'
}, {
  page: 'Study',
  icon: '✧'
}, {
  page: 'Practice',
  icon: '▤'
}, {
  page: 'Progress',
  icon: '↗'
}];
function loadConcepts(): Concept[] {
  try {
    const saved = JSON.parse(localStorage.getItem('study-buddy-demo-v1') || 'null');
    if (Array.isArray(saved) && saved.length === initialConcepts.length && initialConcepts.every(c => saved.some(s => s.id === c.id && Number.isInteger(s.attempts) && s.attempts >= 0 && Number.isInteger(s.correct) && s.correct >= 0 && s.correct <= s.attempts && (s.lastCorrect === undefined || typeof s.lastCorrect === 'boolean')))) return initialConcepts.map(c => ({
      ...c,
      ...saved.find(s => s.id === c.id)
    }));
  } catch {/* Fall back to fresh demo data when storage is unavailable. */}
  return initialConcepts;
}
function DemoWorkspace() {
  const [page, setPage] = useState<Page>('Overview');
  const [role, setRole] = useState('Student');
  const [concepts, setConcepts] = useState(loadConcepts);
  const { focusMode, setFocusMode } = useAccessibility();
  const [hints, setHints] = useState(true);
  const [storageError, setStorageError] = useState(false);
  const [reviewOnly, setReviewOnly] = useState(false);
  const [syllabus, setSyllabus] = useState<SyllabusInfo | null>(loadSyllabusInfo);
  const mainRef = useRef<HTMLElement>(null);
  const isFirstRender = useRef(true);
  const attempts = concepts.reduce((n, c) => n + c.attempts, 0);
  const weak = concepts.filter(c => c.lastCorrect === false).length;
  useEffect(() => {
    // Move focus to the new page's content on navigation (not on first
    // mount) so screen-reader users hear the change instead of losing their
    // place in the nav.
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    mainRef.current?.focus();
  }, [page]);
  function updateSyllabus(info: SyllabusInfo) {
    setSyllabus(info);
    saveSyllabusInfo(info);
  }
  function practice(review = false) {
    setReviewOnly(review);
    setPage('Practice');
  }
  function record(id: string, correct: boolean, miss?: MissRating) {
    const next = concepts.map(c => c.id === id ? applyResult(c, correct, miss) : c);
    setConcepts(next);
    try {
      localStorage.setItem('study-buddy-demo-v1', JSON.stringify(next));
      setStorageError(false);
    } catch {
      setStorageError(true);
    }
  }
  return <div className={focusMode ? 'app focus' : 'app'}>
    <a className="skip-link" href="#main">Skip to content</a>
    <aside className="sidebar">
      <Brand onClick={() => setPage('Overview')} />
      <div className="workspace-label">YOUR WORKSPACE</div>
      <nav aria-label="Main navigation">{nav.map(item => <button key={item.page} className={page === item.page ? 'nav-item active' : 'nav-item'} aria-current={page === item.page ? 'page' : undefined} onClick={() => setPage(item.page)}><span aria-hidden="true">{item.icon}</span>{item.page}{item.page === 'Practice' && weak > 0 && <span className="nav-count">{weak}</span>}</button>)}{role === 'Student' && <button className={`nav-item ${page === 'Materials' ? 'active' : ''}`} aria-current={page === 'Materials' ? 'page' : undefined} onClick={() => setPage('Materials')}><span aria-hidden="true">▥</span>Materials</button>}{role === 'Professor' && <button className={`nav-item ${page === 'Course settings' ? 'active' : ''}`} onClick={() => setPage('Course settings')}>⚙ Course settings</button>}</nav>
      <div className="sidebar-course"><span className="eyebrow">CURRENT COURSE</span><strong>Introduction to Biology</strong><span>BIO 101 · Fall semester</span><div className="course-line" /><small>Week 3 of 16</small></div>
      <div className="sidebar-bottom"><div className="support-note"><span>✓</span><div><strong>Learning, with boundaries.</strong><small>Your instructor guides the way.</small></div></div><button type="button" className={`profile ${page === 'Profile' ? 'active' : ''}`} aria-current={page === 'Profile' ? 'page' : undefined} onClick={() => setPage('Profile')}><span className="avatar">JD</span><div><strong>Jamie Davis</strong><small>{role} demo</small></div></button></div>
    </aside>
    <div className="workspace"><header className="topbar"><span>My courses <span className="slash">/</span> <strong>BIO 101</strong></span><div className="top-actions"><label className="focus-toggle"><input type="checkbox" checked={focusMode} onChange={e => setFocusMode(e.target.checked)} /> Focus mode</label><AccessibilityMenu /><label className="sr-only" htmlFor="role">Demo role</label><select id="role" value={role} onChange={e => {
            setRole(e.target.value);
            setPage(e.target.value === 'Professor' ? 'Course settings' : 'Overview');
          }}><option>Student</option><option>Professor</option></select></div></header>
    <main id="main" ref={mainRef} tabIndex={-1}><div className="demo-banner"><span className="live-dot" /> Interactive demo</div>{storageError && <p role="alert">Browser storage is unavailable. Progress will only last for this session.</p>}
    <div className="page-heading"><div><span className="eyebrow">BIO 101 / {page.toUpperCase()}</span><h1>{page === 'Overview' ? 'A little progress, every day.' : page === 'Study' ? 'Make room for understanding.' : page === 'Practice' ? 'Put your knowledge to work.' : page === 'Progress' ? 'See how far you’ve come.' : page === 'Materials' ? 'Bring your syllabus.' : page === 'Profile' ? 'Make it yours.' : 'Your course. Your guidance.'}</h1><p>{page === 'Overview' ? 'Welcome back, Jamie. What will you learn today?' : page === 'Study' ? 'Explore this week’s concepts with your study companion.' : page === 'Practice' ? 'A few thoughtful questions. A stronger understanding.' : page === 'Progress' ? 'Your learning journey, one concept at a time.' : page === 'Materials' ? 'Upload it once, and the assistant follows it from here.' : page === 'Profile' ? 'Class level and accessibility needs, set once and remembered everywhere.' : 'Configure the sample learning environment.'}</p></div><span className="semester">FALL 2026</span></div>
    {page === 'Overview' && <>
      <section className="overview-grid"><div className="continue-card"><span className="pill">THIS WEEK’S FOCUS</span><h2>Small cells.<br />Big discoveries.</h2><p>Explore the structures and processes<br className="desktop-break" /> that make life possible.</p><button className="light-button" onClick={() => setPage('Study')}>Let’s study <span>↗</span></button><div className="chapter-number" aria-hidden="true">03</div><span className="card-foot">CHAPTER 3 <span>Cell structure & function</span></span></div><div className="next-card"><div className="section-heading"><span className="eyebrow">YOUR NEXT STEP</span><span className="accent">✧</span></div><h2>{weak ? 'Give it another try.' : 'Start with a small win.'}</h2><p>{weak ? `${weak} concept${weak > 1 ? 's could' : ' could'} use another look. Try a different question to build understanding.` : 'A short practice session helps you discover what you know and what to revisit.'}</p><div className="session-meta"><span>◷ About 3 minutes</span><span>{weak || 3} concepts</span></div><button className="primary full" onClick={() => practice(weak > 0)}>{weak ? 'Review weak concepts' : 'Start a quick practice'} <span>→</span></button><small>Small steps count. There’s no grade here.</small></div></section>
      <section className="stats" aria-label="Practice summary"><div><span className="stat-icon blue">▤</span><div><strong>{attempts}</strong><span>Questions practiced</span></div></div><div><span className="stat-icon green">✓</span><div><strong>{concepts.filter(c => status(c) === 'Mastered').length}<small> / 3</small></strong><span>Concepts mastered</span></div></div><div><span className="stat-icon orange">↻</span><div><strong>{weak}</strong><span>Concepts to revisit</span></div></div></section>
      <section className="bottom-grid"><div><div className="section-heading"><h2>Your learning path</h2><button className="text-button" onClick={() => setPage('Progress')}>View progress ↗</button></div><ConceptList concepts={concepts} /></div><aside className="instructor-note"><span className="eyebrow">A NOTE FROM YOUR INSTRUCTOR</span><h3>Understanding comes<br />before the answer.</h3><p>“Start by explaining your thinking. Making mistakes is part of learning, and this is a safe place to make them.”</p><div className="teacher"><span className="avatar">ML</span><div><strong>Dr. Morgan Lee</strong><small>Introduction to Biology</small></div></div></aside></section>
    </>}
    {page === 'Study' && <Study hints={hints} syllabus={syllabus} />}
    {page === 'Practice' && <Practice concepts={concepts} reviewOnly={reviewOnly} onRecord={record} onProgress={() => setPage('Progress')} />}
    {page === 'Materials' && <Materials syllabus={syllabus} onSyllabusChange={updateSyllabus} />}
    {page === 'Profile' && <Profile />}
    {page === 'Progress' && <section className="panel"><div className="section-heading"><div><h2>Concept-level progress</h2><p>Based on your practice in this browser.</p></div><button className="primary" onClick={() => practice(weak > 0)}>Practice {weak ? 'weak concepts' : 'all concepts'} →</button></div><ConceptList concepts={concepts} /><p className="muted">Mastered means at least 3 correct answers, 75% correct overall, and a correct latest attempt. These demo labels are study signals, not grades.</p></section>}
    {page === 'Course settings' && <div className="settings-grid"><section className="panel"><span className="eyebrow">INSTRUCTOR CONTROLS</span><h2>How your assistant helps</h2><p>Try this setting, then switch to Student and open Study. Demo settings last for this session.</p><label className="policy-option"><div><strong>Guide before giving answers</strong><span>Ask students to share an attempt for homework requests.</span></div><input type="checkbox" checked={hints} onChange={e => setHints(e.target.checked)} /></label><div className="policy-option"><div><strong>Current course scope</strong><span>Chapter 3 · Cell structure & function</span></div><span className="badge developing">Active</span></div><p className="muted">This role switch previews the interface. Real accounts, permissions, and policy enforcement require the backend.</p></section><section className="panel"><span className="eyebrow">SAMPLE COURSE MATERIALS</span><h2>Learning starts here.</h2>{['Week 3 lecture notes', 'Chapter 3 reading guide', 'BIO 101 syllabus'].map((name, i) => <div className="material" key={name}><span className="file-icon">PDF</span><div><strong>{name}</strong><small>{[18, 8, 4][i]} pages · Sample reference</small></div></div>)}<p className="muted">Material upload and extraction will connect to the backend.</p></section></div>}
    <footer><span>Made for understanding, not just answers.</span><span>Study Buddy <span className="accent">✧</span></span></footer>
    </main></div>
  </div>;
}
export default DemoWorkspace;
