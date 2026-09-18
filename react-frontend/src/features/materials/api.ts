import { requireSupabase } from '../../lib/supabase'
export type Material = {
  id: string; course_id: string; title: string; source_type: 'file' | 'website'; source_url: string | null;
  bucket: string | null; storage_path: string | null; mime_type: string | null; published: boolean; created_at: string;
}
export type Suggestions = { topics: string[]; objectives: string[]; policy_passages: string[]; uncertainties: string[] }
export type Extraction = { material_id: string; text: string; warnings: string[]; llm_connected: boolean; suggestions: Suggestions | null }
export const MATERIAL_LIMIT = 10 * 1024 * 1024
export const MATERIAL_ACCEPT = '.pdf,.txt,.md,.pptx'
export async function listMaterials(courseId: string) {
  const { data, error } = await requireSupabase().from('course_materials').select('*').eq('course_id', courseId).order('created_at', { ascending: false })
  if (error) throw error
  return data as Material[]
}
export async function addMaterial(courseId: string, title: string, file: File | null, url: string) {
  const db = requireSupabase()
  const id = crypto.randomUUID()
  let uploadedPath: string | null = null
  let mime: string | null = null
  if (!title.trim()) throw new Error('Enter a title.')
  if (file) {
    const extension = file.name.split('.').pop()?.toLowerCase()
    if (!extension || !['pdf', 'txt', 'md', 'pptx'].includes(extension)) throw new Error('Upload a PDF, text, Markdown, or PowerPoint file.')
    if (!file.size || file.size > MATERIAL_LIMIT) throw new Error('Choose a nonempty file up to 10 MiB.')
    mime = extension === 'pdf' ? 'application/pdf' : extension === 'pptx' ? 'application/vnd.openxmlformats-officedocument.presentationml.presentation' : 'text/plain'
    uploadedPath = `${courseId}/${id}.${extension}`
    const { error } = await db.storage.from('course-materials').upload(uploadedPath, file, { contentType: mime, upsert: false })
    if (error) throw error
  } else {
    const parsed = new URL(url)
    if (parsed.protocol !== 'https:' || parsed.username || parsed.password || (parsed.port && parsed.port !== '443')) throw new Error('Use a public HTTPS URL without credentials or a custom port.')
  }
  const { error } = await db.from('course_materials').insert({ id, course_id: courseId, title: title.trim(), source_type: file ? 'file' : 'website', source_url: file ? null : url.trim(), bucket: file ? 'course-materials' : null, storage_path: uploadedPath, mime_type: mime, published: false })
  if (error) {
    if (uploadedPath) {
      const cleanup = await db.storage.from('course-materials').remove([uploadedPath])
      if (cleanup.error) throw new Error('Material could not be saved. A private orphan file remains in Storage; ask the project administrator to remove it.')
    }
    throw error
  }
}
export async function setPublished(material: Material, published: boolean) {
  const { data, error } = await requireSupabase().from('course_materials').update({ published }).eq('id', material.id).eq('course_id', material.course_id).select('id').single()
  if (error) throw error
  if (!data) throw new Error('Material is no longer available.')
}
export async function materialLink(material: Material) {
  if (material.source_type === 'website') {
    const url = new URL(material.source_url!)
    if (url.protocol !== 'https:') throw new Error('Invalid website address.')
    return url.href
  }
  const { data, error } = await requireSupabase().storage.from(material.bucket!).createSignedUrl(material.storage_path!, 60)
  if (error) throw error
  return data.signedUrl
}
export async function extractMaterial(material: Material, withAI: boolean): Promise<Extraction> {
  const { data, error } = await requireSupabase().auth.getSession()
  if (error) throw error
  if (!data.session) throw new Error('Sign in again to process this material.')
  const base = import.meta.env.VITE_API_URL?.replace(/\/$/, '') || 'http://localhost:8000'
  let response: Response
  try {
    response = await fetch(`${base}/courses/${material.course_id}/materials/${material.id}/${withAI ? 'suggest' : 'extract'}`, { method: 'POST', headers: { Authorization: `Bearer ${data.session.access_token}` }, signal: AbortSignal.timeout(120000) })
  } catch { throw new Error('Cannot reach the processing API, or the request timed out. Check that the Python backend is running.') }
  const result = await response.json()
  if (!response.ok) throw new Error(typeof result.detail === 'string' ? result.detail : 'The document could not be processed.')
  return result
}
