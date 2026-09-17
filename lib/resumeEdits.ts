/**
 * Per-resume edits of EVERY field (2026-09-17, founder decision).
 *
 * A saved resume is the user's own document for one application. The founder
 * decided every field of it is editable — name, headline, contact line, each
 * role's title / company / location / dates / activities, skills,
 * certifications, education, additional information — and that those edits
 * stay on THIS resume only. The Career Profile is never changed here; a user
 * may call a role "Senior Engineer" on one application without rewriting their
 * master profile. The AI optimizer is unaffected: it still changes only the
 * summary and the activities, from profile facts.
 *
 * User edits are the user's own words, so no grounding rule applies to them.
 * This module only makes the incoming document SAFE TO STORE AND RENDER: known
 * shape, bounded sizes, plain strings, stable ids. Anything it does not
 * recognise is dropped, never passed through. The photo is presentation owned
 * by the application and is kept from the stored snapshot.
 *
 * Every downstream service (PDF, DOCX, cover letter, interview Q&A, mock
 * interview) already reads `document_snapshot`, so an edit saved here is what
 * they all use.
 */

import type { ResumeContactItem, ResumeDocument } from '@/lib/resumeDocument'

const LIMITS = {
  short: 200,
  line: 400,
  summary: 4000,
  bullet: 600,
  roles: 40,
  bullets: 25,
  skills: 120,
  items: 40,
  contacts: 14,
}

const CONTACT_KINDS: ResumeContactItem['kind'][] = [
  'nationality', 'location', 'visa', 'phone', 'whatsapp', 'email', 'linkedin', 'dob', 'passport', 'notice',
]

function isObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function str(v: unknown, max: number): string {
  if (typeof v !== 'string') return ''
  return v.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '').trim().slice(0, max)
}

let seq = 0
function safeId(v: unknown, prefix: string): string {
  if (typeof v === 'string' && /^[A-Za-z0-9_-]{1,64}$/.test(v)) return v
  seq = (seq + 1) % 1_000_000
  return `${prefix}-${Date.now().toString(36)}-${seq.toString(36)}`
}

function list(v: unknown, max: number): unknown[] {
  return Array.isArray(v) ? v.slice(0, max) : []
}

export class ResumeEditError extends Error {
  constructor(readonly field: string) {
    super('Invalid field: ' + field)
  }
}

/**
 * Build the document to store from the user's edited copy. `existing` supplies
 * the photo and any entry metadata the editor does not send.
 */
export function sanitizeEditedDocument(incoming: unknown, existing: ResumeDocument | null): ResumeDocument {
  if (!isObject(incoming)) throw new ResumeEditError('document')
  const h = isObject(incoming.header) ? incoming.header : {}

  const contactItems: ResumeContactItem[] = list(h.contactItems, LIMITS.contacts)
    .filter(isObject)
    .map((c) => ({
      kind: CONTACT_KINDS.includes(c.kind as ResumeContactItem['kind']) ? (c.kind as ResumeContactItem['kind']) : 'location',
      text: str(c.text, LIMITS.short),
    }))
    .filter((c) => c.text !== '')

  const displayName = str(h.displayName, LIMITS.short)
  const targetJobTitle = str(h.targetJobTitle, LIMITS.short)
  const identityPrimary = str(h.identityPrimary, LIMITS.line)
  const identityContact = str(h.identityContact, LIMITS.line)
  const identityGulf = str(h.identityGulf, LIMITS.line)
  const hasAnyIdentity = Boolean(identityPrimary || identityContact || identityGulf || contactItems.length)

  const existingRoles = new Map((existing?.experience ?? []).map((x) => [x.entry.id, x]))
  const experience = list(incoming.experience, LIMITS.roles)
    .filter(isObject)
    .map((x, i) => {
      const entryIn = isObject(x.entry) ? x.entry : {}
      const id = safeId(entryIn.id, 'role')
      const prior = existingRoles.get(id)?.entry
      const role = str(entryIn.role, LIMITS.short)
      const company = str(entryIn.company, LIMITS.short)
      return {
        entry: {
          ...(prior ?? {}),
          id,
          role,
          company: company || prior?.company || '',
          sort_order: i,
        } as ResumeDocument['experience'][number]['entry'],
        bullets: list(x.bullets, LIMITS.bullets).map((b) => str(b, LIMITS.bullet)).filter(Boolean),
        range: str(x.range, LIMITS.short),
        companyLine: str(x.companyLine, LIMITS.line),
      }
    })
    .filter((x) => x.entry.role || x.companyLine || x.bullets.length)

  const skills = list(incoming.skills, LIMITS.skills)
    .filter(isObject)
    .map((s, i) => ({
      id: safeId(s.id, 'skill'),
      profile_id: typeof s.profile_id === 'string' ? s.profile_id : '',
      name: str(s.name, LIMITS.short),
      sort_order: i,
      created_at: typeof s.created_at === 'string' ? s.created_at : '',
    }))
    .filter((s) => s.name !== '')

  const withEntry = <T extends { entry: { id: string } }>(items: unknown[], prefix: string, map: (x: Record<string, unknown>) => Omit<T, 'entry'>) =>
    items
      .filter(isObject)
      .map((x, i) => {
        const entryIn = isObject(x.entry) ? x.entry : {}
        return { entry: { ...entryIn, id: safeId(entryIn.id, prefix), sort_order: i }, ...map(x) } as unknown as T
      })

  const certifications = withEntry<ResumeDocument['certifications'][number]>(list(incoming.certifications, LIMITS.items), 'cert', (x) => ({
    display: str(x.display, LIMITS.line),
  })).filter((c) => c.display !== '')

  const education = withEntry<ResumeDocument['education'][number]>(list(incoming.education, LIMITS.items), 'edu', (x) => ({
    line: str(x.line, LIMITS.line),
    years: str(x.years, LIMITS.short),
  })).filter((e) => e.line !== '')

  const additional = withEntry<ResumeDocument['additional'][number]>(list(incoming.additional, LIMITS.items), 'info', (x) => ({
    display: str(x.display, LIMITS.line),
  })).filter((a) => a.display !== '')

  return {
    header: {
      // Presentation owned by the application: kept from what was stored.
      showPhoto: existing?.header.showPhoto ?? false,
      photoUrl: existing?.header.photoUrl ?? null,
      displayName,
      targetJobTitle,
      hasAnyIdentity,
      identityPrimary,
      identityContact,
      identityGulf,
      hasHeaderText: Boolean(displayName || targetJobTitle || hasAnyIdentity),
      contactItems,
    },
    summary: str(incoming.summary, LIMITS.summary),
    experience,
    skills,
    certifications,
    education,
    additional,
  }
}

const PRIMARY_KINDS: ResumeContactItem['kind'][] = ['nationality', 'location', 'visa']
const CONTACT_LINE_KINDS: ResumeContactItem['kind'][] = ['phone', 'whatsapp', 'email', 'linkedin']
const GULF_KINDS: ResumeContactItem['kind'][] = ['dob', 'passport', 'notice']

/**
 * Keep the three joined identity lines in step with edited contact items, for
 * templates that print lines rather than items. Client-safe.
 */
export function withSyncedIdentity(doc: ResumeDocument): ResumeDocument {
  // Older documents carry only the joined lines; those lines are edited directly.
  if (!Array.isArray(doc.header.contactItems)) return doc
  const items = doc.header.contactItems
  const join = (kinds: ResumeContactItem['kind'][]) =>
    items.filter((i) => kinds.includes(i.kind) && i.text.trim()).map((i) => i.text.trim()).join(' · ')
  const identityPrimary = join(PRIMARY_KINDS)
  const identityContact = join(CONTACT_LINE_KINDS)
  const identityGulf = join(GULF_KINDS)
  const hasAnyIdentity = Boolean(identityPrimary || identityContact || identityGulf)
  return {
    ...doc,
    header: {
      ...doc.header,
      identityPrimary,
      identityContact,
      identityGulf,
      hasAnyIdentity,
      hasHeaderText: Boolean(doc.header.displayName || doc.header.targetJobTitle || hasAnyIdentity),
    },
  }
}

export const CONTACT_KIND_LABELS: Record<ResumeContactItem['kind'], string> = {
  nationality: 'Nationality',
  location: 'Location',
  visa: 'Visa',
  phone: 'Phone',
  whatsapp: 'WhatsApp',
  email: 'Email',
  linkedin: 'LinkedIn',
  dob: 'Date of birth',
  passport: 'Passport',
  notice: 'Notice period',
}
