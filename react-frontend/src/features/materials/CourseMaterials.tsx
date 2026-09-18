import { useEffect, useState, type FormEvent } from 'react'
import { EmptyState } from '../../components/EmptyState'
import { errorMessage } from '../../lib/supabase'
import { addMaterial, extractMaterial, listMaterials, MATERIAL_ACCEPT, materialLink, setPublished, type Extraction, type Material } from './api'
import { defaultPolicy, loadPolicy, savePolicy } from '../policies/api'
import './materials.css'

export function CourseMaterials({ courseId, editable }: { courseId: string; editable: boolean }) {
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [revision, setRevision] = useState(0)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [busy, setBusy] = useState(false)
  const [title, setTitle] = useState('')
  const [mode, setMode] = useState('file')
  const [url, setUrl] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<Extraction | null>(null)
  const [topics, setTopics] = useState('')
  const [objectives, setObjectives] = useState('')
  const [link, setLink] = useState<{ id: string; url: string } | null>(null)
  useEffect(() => {
    let active = true
    listMaterials(courseId).then(data => { if (active) setMaterials(data) }).catch(error => { if (active) setError(errorMessage(error)) }).finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [courseId, revision])
  async function run(action: () => Promise<void>) {
    if (busy) return
    setBusy(true); setError(''); setNotice('')
    try { await action() } catch (error) { setError(errorMessage(error)) } finally { setBusy(false) }
  }
  function submit(event: FormEvent) {
    event.preventDefault()
    void run(async () => {
      if (mode === 'file' && !file) throw new Error('Choose a file first.')
      await addMaterial(courseId, title, mode === 'file' ? file : null, url)
      setTitle(''); setUrl(''); setFile(null); setRevision(n => n + 1); setNotice('Saved as a private draft. Review it before publishing to students.')
    })
  }
  async function previewMaterial(material: Material, ai: boolean) {
    setPreview(null)
    const result = await extractMaterial(material, ai)
    setPreview(result); setTopics(result.suggestions?.topics.join('\n') || ''); setObjectives(result.suggestions?.objectives.join('\n') || '')
  }
  return <div className="materials-workspace">
    {editable && <section className="panel"><h2>Add course material</h2><p>PDF, text, Markdown, or a public syllabus webpage. New materials stay private until you publish them.</p><form onSubmit={submit}><fieldset className="form-fields" disabled={busy}><label>Title<input value={title} maxLength={200} required onChange={event => setTitle(event.target.value)}/></label><label>Source<select value={mode} onChange={event => setMode(event.target.value)}><option value="file">Upload a document</option><option value="website">Website URL</option></select></label>{mode === 'file' ? <label>Document (up to 10 MiB)<input key={revision} type="file" accept={MATERIAL_ACCEPT} required onChange={event => setFile(event.target.files?.[0] || null)}/></label> : <label>Public HTTPS address<input type="url" maxLength={2000} value={url} required onChange={event => setUrl(event.target.value)} placeholder="https://university.edu/course/syllabus"/></label>}<button className="primary">{busy ? 'Please wait…' : 'Save draft'}</button></fieldset></form></section>}
    {error && <div className="form-error" role="alert">{error} <button className="text-button" onClick={() => { setError(''); setLoading(true); setRevision(n => n + 1) }}>Reload materials</button></div>}{notice && <p className="form-message" role="status">{notice}</p>}
    {loading ? <p role="status">Loading materials…</p> : materials.length === 0 ? <EmptyState title="No materials yet" description={editable ? 'Add a syllabus to begin building your course library.' : 'Your instructor’s published materials will appear here.'}/> : <section className="panel"><h2>Course library</h2>{materials.map(material => <article className="course-material-row" key={material.id}><div><h3>{material.title}</h3><span className="badge">{material.source_type === 'website' ? 'Website' : material.mime_type === 'application/pdf' ? 'PDF' : 'Text'} · {material.published ? 'Published' : 'Private draft'}</span></div><div className="material-actions"><button className="secondary" disabled={busy} onClick={() => void run(async () => setLink({ id: material.id, url: await materialLink(material) }))}>Get access link</button>{editable && <><button className="secondary" disabled={busy} onClick={() => void run(() => previewMaterial(material, false))}>Preview text</button><button className="secondary" disabled={busy} onClick={() => void run(() => previewMaterial(material, true))}>Suggest topics with AI</button><button className="primary" disabled={busy} onClick={() => void run(async () => { await setPublished(material, !material.published); setLink(null); setRevision(n => n + 1) })}>{material.published ? 'Unpublish' : 'Publish to students'}</button></>}</div>{link?.id === material.id && <p><a href={link.url} target="_blank" rel="noopener noreferrer">Open {material.title} ↗</a>{material.source_type === 'file' && <small> · File link expires in 60 seconds.</small>}</p>}</article>)}</section>}
    {busy && <p role="status">Working… document processing may take a moment.</p>}
    {preview && <section className="panel"><h2>Review extracted content</h2>{preview.warnings.map((warning, index) => <p className="muted" key={index}>{warning}</p>)}<details><summary>Extracted text</summary><pre className="extracted-text">{preview.text}</pre></details>{preview.suggestions ? <><p>Review and edit these suggestions against the source. Saving replaces this course’s approved topics and objectives; assistance rules stay unchanged.</p><div className="form-fields"><label>Topics<textarea rows={5} value={topics} onChange={event => setTopics(event.target.value)}/></label><label>Objectives<textarea rows={5} value={objectives} onChange={event => setObjectives(event.target.value)}/></label></div><h3>Possible policy passages</h3>{preview.suggestions.policy_passages.map((passage, index) => <blockquote key={index}>{passage}</blockquote>)}{preview.suggestions.uncertainties.map((item, index) => <p key={index}>{item}</p>)}<button className="primary" disabled={busy} onClick={() => void run(async () => {
      const policy = await loadPolicy(courseId) || defaultPolicy(courseId)
      const lines = (text: string) => text.split('\n').map(line => line.trim()).filter(Boolean)
      await savePolicy({ ...policy, topics: lines(topics), objectives: lines(objectives) })
      setNotice('Reviewed topics and objectives saved. Review assistance rules in Course settings.'); setPreview(null)
    })}>Approve and save topics</button></> : <p>Text extraction succeeded. Choose “Suggest topics with AI” to request structured suggestions; the backend needs an OpenAI API key.</p>}</section>}
  </div>
}
