import { NextRequest, NextResponse } from 'next/server'
import { calculateGulfReadiness } from '@/lib/gulfReadiness/engine'
import type { FunnelAnswers } from '@/lib/gulfReadiness/types'
import { resumeTextFromFile } from '@/lib/resumeTextFromUpload'
import {
  getClientIdentityHash,
  getAnonymousRateLimitStatus,
  incrementAnonymousRateLimit,
  LIMIT_ACTION_ANON_ATS_SCAN,
} from '@/lib/anonymousRateLimit'

/**
 * The anonymous Gulf Readiness Scorecard endpoint.
 *
 * NO MODEL CALL, NO DATABASE WRITE, NO PROFILE RECORD. It extracts text from the
 * uploaded resume (PDF.js / mammoth — characters, not a provider), runs the
 * arithmetic engine on that text plus the funnel answers, and returns the result.
 * The resume is seen transiently to be read and is never persisted. This is what
 * lets the product say, truthfully, that it does not save an anonymous resume.
 *
 * The only server state it touches is the anonymous rate-limit counter, which
 * holds an IP hash and a count — never resume content.
 *
 * The score itself is deterministic, so this endpoint is really a convenience: the
 * same engine could run in the browser. It lives on the server so the file
 * extraction (which needs the Node libraries) and the score come from one place,
 * and so the result the client stores for signup is the same object the engine
 * produces here.
 */

const MAX_TEXT = 20000
const MIN_TEXT = 50

function parseAnswers(raw: unknown): FunnelAnswers | null {
  if (typeof raw !== 'string') return null
  let o: Record<string, unknown>
  try {
    o = JSON.parse(raw) as Record<string, unknown>
  } catch {
    return null
  }
  if (typeof o.hasGulfExperience !== 'boolean') return null
  // Validate the branch that matters and ignore the other, so a malformed combo
  // cannot select a scenario by accident.
  if (o.hasGulfExperience) {
    if (typeof o.currentlyInGulf !== 'boolean') return null
    return { hasGulfExperience: true, currentlyInGulf: o.currentlyInGulf }
  }
  if (typeof o.hasProfessionalExperience !== 'boolean') return null
  return { hasGulfExperience: false, hasProfessionalExperience: o.hasProfessionalExperience }
}

export async function POST(request: NextRequest): Promise<NextResponse> {
  // Rate limit first, before any file work — same discipline as every paid route,
  // even though this one spends no tokens: file parsing is still real CPU an
  // anonymous caller could abuse.
  const identityHash = getClientIdentityHash(request)
  const limit = await getAnonymousRateLimitStatus({ identityHash, action: LIMIT_ACTION_ANON_ATS_SCAN })
  if (!limit.allowed) {
    return NextResponse.json({ error: limit.message ?? 'Daily limit reached.' }, { status: 429 })
  }

  let formData: FormData
  try {
    formData = await request.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid request body' }, { status: 400 })
  }

  const answers = parseAnswers(formData.get('answers'))
  if (!answers) {
    return NextResponse.json({ error: 'Please answer the questions before we score your resume.' }, { status: 400 })
  }

  // Resume text: from a file (extracted here) or pasted directly.
  let resumeText = ''
  const file = formData.get('file')
  const pasted = formData.get('resume_text')

  if (file instanceof File) {
    const extracted = await resumeTextFromFile(file)
    if (!extracted.ok) {
      return NextResponse.json({ error: extracted.error, code: extracted.code }, { status: 400 })
    }
    resumeText = extracted.text
  } else if (typeof pasted === 'string') {
    resumeText = pasted
  }

  if (resumeText.trim().length < MIN_TEXT) {
    return NextResponse.json(
      { error: 'Upload a resume or paste at least 50 characters of resume text.' },
      { status: 400 },
    )
  }
  resumeText = resumeText.slice(0, MAX_TEXT)

  const result = calculateGulfReadiness({ answers, resumeText })

  // Count the scan against the daily limit only after it succeeded — a failed read
  // should not cost the visitor an attempt.
  await incrementAnonymousRateLimit({ identityHash, action: LIMIT_ACTION_ANON_ATS_SCAN })

  // The result plus the resume text go back to the CLIENT, which holds them in
  // sessionStorage for the signup handoff. Nothing is written server-side.
  return NextResponse.json({ success: true, result, resumeText })
}
