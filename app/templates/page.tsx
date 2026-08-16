'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { TemplatePicker } from '@/components/resume/TemplatePicker'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
import { getTemplate, DEFAULT_TEMPLATE_ID, type TemplateId } from '@/lib/templates'
import { buildResumeDocument, type ResumeDocument } from '@/lib/resumeDocument'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { OptimizedContent, Package } from '@/types/package'

/**
 * Resume Templates — pick a look, load one of your resumes into it, save.
 *
 * The reverse of /package/[id], which starts from a resume and changes its
 * template. Here the user starts from the TEMPLATE. Same registry, same
 * renderer, same PATCH — nothing about a resume's content is touched, so a
 * save from this screen is exactly the switch the resume page performs.
 *
 * Only PAID resumes are listed. An unpaid package has no content to preview,
 * and offering it would put a template choice against a document the user has
 * not unlocked.
 */

function TemplatesInner() {
  const [packages, setPackages] = useState<Package[] | null>(null)
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [selectedId, setSelectedId] = useState<string>('')
  const [templateId, setTemplateId] = useState<TemplateId>(DEFAULT_TEMPLATE_ID)
  const [saving, setSaving] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const didInit = useRef(false)

  useEffect(() => {
    if (didInit.current) return
    didInit.current = true
    Promise.all([
      fetch('/api/packages', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
      fetch('/api/profile', { cache: 'no-store' }).then((r) => (r.ok ? r.json() : null)),
    ])
      .then(([pkgData, profileData]) => {
        const all = ((pkgData?.packages as Package[] | undefined) ?? []).filter((p) => p.is_paid)
        setPackages(all)
        setProfile(profileData as CareerProfileFull | null)
        if (all.length > 0) {
          setSelectedId(all[0].id)
          setTemplateId(getTemplate(all[0].template_id).id)
        }
      })
      .catch(() => setError('Could not load your resumes.'))
  }, [])

  const selected = packages?.find((p) => p.id === selectedId) ?? null

  // The document to preview: the resume's frozen copy when it has one, else
  // rebuilt from the live profile — the same fallback the resume page uses, so
  // a resume created before snapshots still previews here.
  const document: ResumeDocument | null =
    (selected?.document_snapshot as ResumeDocument | null) ??
    (selected && profile
      ? buildResumeDocument({
          profile,
          optimizedContent: (selected.optimized_content ?? {
            summary: { generated: '', source_profile_summary: '' },
            experience_blocks: [],
          }) as OptimizedContent,
          skillsOrder: selected.skills_order ?? [],
          fieldVisibility: selected.field_visibility_snapshot ?? null,
        })
      : null)

  const save = useCallback(async () => {
    if (!selected || saving) return
    setSaving(true)
    setMessage(null)
    setError(null)
    try {
      const res = await fetch(`/api/packages/${encodeURIComponent(selected.id)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ templateId }),
      })
      if (!res.ok) {
        const b = await res.json().catch(() => ({}))
        setError((b?.error as string) ?? 'Could not save the template.')
        return
      }
      setPackages((prev) =>
        prev ? prev.map((p) => (p.id === selected.id ? { ...p, template_id: templateId } : p)) : prev,
      )
      setMessage('Saved to your Resume Library.')
    } catch {
      setError('Network error. Please try again.')
    } finally {
      setSaving(false)
    }
  }, [selected, saving, templateId])

  if (packages === null) {
    return <p className="px-5 py-20 text-center font-mono text-sm text-ink-400">Loading…</p>
  }

  const Preview = getTemplate(templateId).component
  const isDirty = selected ? getTemplate(selected.template_id).id !== templateId : false

  return (
    <main className="mx-auto flex w-full max-w-[1240px] flex-col gap-5 px-5 pb-10 pt-2">
      <div className="flex flex-col gap-1">
        <h1 className="font-serif text-[27px] leading-tight text-ink-900">Resume templates</h1>
        <p className="text-[13.5px] text-ink-700">
          Pick a design, load one of your resumes into it, and save. Your wording never changes —
          only the look.
        </p>
      </div>

      {packages.length === 0 ? (
        <div className="rounded-radius-lg border border-dashed border-line-light bg-surface-light p-8 text-center">
          <p className="text-[14px] font-semibold text-ink-900">No resumes yet</p>
          <p className="mt-1 text-[13px] text-ink-700">
            Once you have created and unlocked a resume, you can try it in any template here.
          </p>
        </div>
      ) : (
        <>
          <label className="flex flex-wrap items-center gap-2 text-[12.5px] text-ink-700">
            <span className="font-semibold">Resume</span>
            <select
              value={selectedId}
              onChange={(e) => {
                const next = e.target.value
                setSelectedId(next)
                const p = packages.find((x) => x.id === next)
                setTemplateId(getTemplate(p?.template_id).id)
                setMessage(null)
                setError(null)
              }}
              className="min-h-11 min-w-[260px] rounded-radius-md border border-line-light bg-surface-light px-3 text-[13px] text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest"
            >
              {packages.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name?.trim() || p.target_job_title} — {p.id.slice(0, 8)}
                </option>
              ))}
            </select>
          </label>

          <div className="flex flex-col gap-5 lg:flex-row">
            <div className="lg:flex-1 lg:min-w-0">
              <TemplatePicker
                document={
                  document ?? {
                    header: {
                      showPhoto: false, photoUrl: null, displayName: '', targetJobTitle: '',
                      hasAnyIdentity: false, identityPrimary: '', identityContact: '',
                      identityGulf: '', hasHeaderText: false,
                    },
                    summary: '', experience: [], skills: [], certifications: [],
                    education: [], additional: [],
                  }
                }
                current={templateId}
                onSelect={(id) => {
                  setTemplateId(id)
                  setMessage(null)
                }}
              />
            </div>

            <div className="lg:w-[420px] lg:shrink-0">
              <div className="rounded-radius-lg bg-surface-2-light p-3">
                {document ? (
                  <ResumeDocumentView>
                    {/* The template only reads `document` here; the profile and
                        optimized-content props exist for the legacy path where
                        no snapshot is available and are unused in this view. */}
                    <Preview
                      {...({
                        document,
                        skillsOrder: [],
                        fieldVisibility: null,
                      } as unknown as React.ComponentProps<typeof Preview>)}
                    />
                  </ResumeDocumentView>
                ) : (
                  <p className="p-8 text-center text-[13px] text-ink-400">
                    Select a resume to preview it.
                  </p>
                )}
              </div>

              <button
                type="button"
                onClick={() => void save()}
                disabled={!isDirty || saving}
                className="mt-3 inline-flex min-h-11 w-full items-center justify-center rounded-radius-md bg-forest px-4 py-3 text-[13px] font-bold text-white disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-forest focus-visible:ring-offset-2"
              >
                {saving ? 'Saving…' : isDirty ? 'Save to my Resume Library' : 'Already using this template'}
              </button>
              {message ? <p className="mt-2 text-center text-[12px] text-forest">{message}</p> : null}
              {error ? (
                <p role="alert" className="mt-2 text-center text-[12px] text-terra">
                  {error}
                </p>
              ) : null}
            </div>
          </div>
        </>
      )}
    </main>
  )
}

export default function TemplatesPage() {
  return (
    <AppShell>
      <TemplatesInner />
    </AppShell>
  )
}
