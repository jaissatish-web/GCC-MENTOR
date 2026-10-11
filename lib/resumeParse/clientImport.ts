import type { CareerProfileDraft } from '@/types/careerProfile'
import type { ParseWarning } from './check'

export class ResumeFileReadError extends Error {}

/** Read mobile/cloud-picker bytes before starting the paid extraction request.
 * A buffered Blob no longer depends on a temporary Android file-provider handle.
 */
export async function uploadResumeFile(file: File): Promise<Response> {
  if (/\.doc$/i.test(file.name)) throw new ResumeFileReadError("Older .doc files can't be read. Save it as .docx or PDF, or paste your CV text.")
  if (!/\.(pdf|docx)$/i.test(file.name)) throw new ResumeFileReadError('Only PDF and Word (.docx) files are supported.')
  const pdf = /\.pdf$/i.test(file.name)
  if (file.size > (pdf ? 4 : 2) * 1024 * 1024) throw new ResumeFileReadError('This file is too large. PDFs can be up to 4MB and Word (.docx) files up to 2MB.')
  let bytes: ArrayBuffer
  try {
    bytes = await file.arrayBuffer()
  } catch {
    throw new ResumeFileReadError('Your browser could not open this file. Download the resume to your device, then choose that downloaded file, or paste your CV text.')
  }
  if (!bytes.byteLength || bytes.byteLength !== file.size) throw new ResumeFileReadError('This file is empty or could not be fully read. Download it to your device and choose it again, or paste your CV text.')
  const form = new FormData()
  form.append('file', new Blob([bytes], { type: pdf ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' }), file.name)
  return fetch('/api/parse/upload', { method: 'POST', body: form })
}

interface RecreationQuota {
  limit: number
  used: number
  remaining: number
  resetsOnLabel: string
}

type ImportResult =
  | { ok: true; draft: CareerProfileDraft; warnings?: ParseWarning[] }
  | { ok: false; error: string; checkSaved: boolean; recreation?: RecreationQuota }

export const IMPORT_DISPLAY_FAILED = 'Your CV was read, but we could not open the profile editor. Check for a saved CV reading before uploading again.'

/** Only transport/file failures belong here; editor errors must not be called network errors. */
export async function requestResumeImport(call: () => Promise<Response>): Promise<ImportResult> {
  let res: Response
  try {
    res = await call()
  } catch (error) {
    if (error instanceof ResumeFileReadError) return { ok: false, error: error.message, checkSaved: false }
    return { ok: false, error: 'The connection to the CV reader was interrupted. Your CV may still be processing. Check for a saved CV reading before trying again.', checkSaved: true }
  }
  // A connection can also drop while receiving the JSON, after extraction finished.
  const body = await res.json().catch(() => null) as {
    draft?: CareerProfileDraft; report?: { warnings?: ParseWarning[] }
    error?: string; code?: string; recreation?: RecreationQuota
  } | null
  if (res.ok && body?.draft) return { ok: true, draft: body.draft, warnings: body.report?.warnings }
  if (res.status === 401) return { ok: false, error: "Your sign-in could not be confirmed. Please sign in again, then choose your resume. It wasn't processed.", checkSaved: false }
  const fallback = res.status === 413
    ? 'This file is too large. PDFs can be up to 4MB and Word (.docx) files up to 2MB.'
    : res.status === 504
      ? 'We did not receive the CV reading in time. Check for a saved CV reading before uploading again.'
      : 'We could not receive a complete CV reading. Please check for a saved CV reading before trying again.'
  return {
    ok: false,
    error: typeof body?.error === 'string' ? body.error : fallback,
    checkSaved: res.ok || res.status >= 500,
    recreation: body?.code === 'RECREATE_LIMIT' ? body.recreation : undefined,
  }
}
