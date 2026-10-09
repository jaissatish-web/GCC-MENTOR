'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import {
  IdentificationIcon,
  ArrowUpTrayIcon,
  DocumentTextIcon,
  UserCircleIcon,
  EyeIcon,
  CheckIcon,
} from '@heroicons/react/24/outline'
import { PageShell } from '@/components/layout/PageShell'
import { ProcessingOrbit } from '@/components/ui/Processing'
import type { CareerProfileFull } from '@/types/careerProfile'
import { checklistKeys, completion, publicText } from '@/lib/linkedin/model'
import {
  DEFAULT_SETUP,
  FIELD_LIMITS,
  type LinkedInConflict,
  type LinkedInDraft,
  type LinkedInSetup,
} from '@/lib/linkedin/types'
import { ProfilePreview } from './ProfilePreview'

const primary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl bg-teal px-5 py-3 text-sm font-semibold text-white transition hover:bg-teal-dark disabled:cursor-not-allowed disabled:opacity-50'
const secondary =
  'inline-flex min-h-11 items-center justify-center gap-2 rounded-ctl border border-line bg-white px-4 py-2 text-sm font-semibold text-ink hover:bg-canvas disabled:opacity-50'
const input =
  'w-full min-w-0 rounded-ctl border border-line bg-white px-3 py-2.5 text-base text-ink focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'
const card = 'ui-surface min-w-0 rounded-card border border-line bg-white p-4 sm:p-7'

async function responseJson(response: Response) {
  const body = await response.json().catch(() => ({
    error: 'The service could not respond. Please try again.',
  }))
  if (!response.ok) throw new Error(body.error ?? 'Please try again.')
  return body
}
function Field({
  label,
  help,
  children,
}: {
  label: string
  help?: string
  children: React.ReactNode
}) {
  return (
    <label className="block min-w-0 space-y-2">
      <span className="block text-sm font-semibold text-ink">{label}</span>
      {children}
      {help && (
        <span className="block text-sm leading-6 text-ink-muted">{help}</span>
      )}
    </label>
  )
}
export function LinkedInWorkspace() {
  const [profile, setProfile] = useState<CareerProfileFull | null>(null)
  const [draft, setDraft] = useState<LinkedInDraft | null>(null)
  const [setup, setSetup] = useState<LinkedInSetup>(DEFAULT_SETUP)
  const [view, setView] = useState<'setup' | 'results' | 'preview'>('setup')
  const [stage, setStage] = useState(0)
  const [fingerprint, setFingerprint] = useState('')
  const [conflicts, setConflicts] = useState<LinkedInConflict[]>([])
  const [acknowledged, setAcknowledged] = useState<string[]>([])
  const [confirmed, setConfirmed] = useState(false)
  const [pasted, setPasted] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [stale, setStale] = useState(false)
  const [dirty, setDirty] = useState(false)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<'import' | 'generate' | 'save' | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [missingProfile, setMissingProfile] = useState(false)

  async function load(initial = false) {
    setError('')
    if (initial) setLoading(true)
    try {
      const [profileResponse, draftResponse] = await Promise.all([
        fetch('/api/profile'),
        fetch('/api/linkedin'),
      ])
      if (profileResponse.status === 404 || draftResponse.status === 422) {
        setMissingProfile(true)
        return
      }
      const [nextProfile, data] = await Promise.all([
        responseJson(profileResponse),
        responseJson(draftResponse),
      ])
      setProfile(nextProfile)
      setDraft(data.draft)
      setFingerprint(data.fingerprint)
      setConflicts(data.conflicts)
      setStale(data.stale)
      setAcknowledged([])
      setConfirmed(false)
      setDirty(false)
      setMissingProfile(false)
      if (initial) {
        setSetup(
          data.draft?.setup ?? {
            ...DEFAULT_SETUP,
            targetRoles: nextProfile.target_job_title ?? '',
            industries: nextProfile.target_industry ?? '',
            countries: nextProfile.target_country?.replaceAll('_', ' ') ?? '',
            experienceIds: nextProfile.work_experience
              .slice(0, 12)
              .map((entry: { id: string }) => entry.id),
          },
        )
        if (data.draft?.output) setView('results')
      } else
        setNotice(
          'Career Profile and saved draft refreshed. Review the latest details before continuing.',
        )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not load your profile.')
    } finally {
      setLoading(false)
    }
  }
  useEffect(() => {
    void load(true)
  }, []) // Loaded once; refresh is an explicit user action.

  function changeSetup<K extends keyof LinkedInSetup>(
    key: K,
    value: LinkedInSetup[K],
  ) {
    setSetup((old) => ({ ...old, [key]: value }))
  }
  async function importProfile() {
    setBusy('import')
    setError('')
    setNotice('')
    try {
      let request: RequestInit
      if (setup.source === 'upload') {
        if (!file) throw new Error('Choose a PDF or DOCX first.')
        const form = new FormData()
        form.set('file', file)
        form.set('revision', draft?.revision ?? '')
        request = { method: 'POST', body: form }
      } else
        request = {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: pasted,
            revision: draft?.revision ?? null,
          }),
        }
      const data = await responseJson(
        await fetch('/api/linkedin/import', request),
      )
      setDraft(data.draft)
      setConflicts(data.conflicts)
      setFingerprint(data.fingerprint)
      setAcknowledged([])
      setConfirmed(false)
      setDirty(false)
      changeSetup('mode', 'existing')
      setNotice(
        'Extraction complete. Review the details and any differences below.',
      )
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Import failed.')
    } finally {
      setBusy(null)
    }
  }
  async function generate() {
    setBusy('generate')
    setError('')
    setNotice('')
    try {
      const data = await responseJson(
        await fetch('/api/linkedin/generate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            setup,
            revision: draft?.revision ?? null,
            fingerprint,
            importId: draft?.imported?.id,
            confirmImport: confirmed,
            acknowledged,
          }),
        }),
      )
      setDraft(data.draft)
      setFingerprint(data.fingerprint)
      setStale(false)
      setDirty(false)
      setView('results')
      setNotice('Your content has been prepared, fact-checked and saved.')
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Generation failed.')
    } finally {
      setBusy(null)
    }
  }
  async function save() {
    if (!draft) return
    setBusy('save')
    setError('')
    setNotice('')
    try {
      const data = await responseJson(
        await fetch('/api/linkedin', {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            revision: draft.revision,
            output: draft.output,
            selected_headline: draft.selected_headline,
            completed: draft.completed,
            skipped: draft.skipped,
          }),
        }),
      )
      setDraft(data.draft)
      setDirty(false)
      setNotice('Your changes and checklist are saved.')
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Save failed.')
    } finally {
      setBusy(null)
    }
  }
  function edit(key: string, update: (old: LinkedInDraft) => LinkedInDraft) {
    setDraft((old) =>
      old
        ? {
            ...update(old),
            completed: old.completed.filter((item) => item !== key),
          }
        : null,
    )
    setDirty(true)
    setNotice('')
  }
  function mark(key: string, mode: 'completed' | 'skipped') {
    setDraft((old) => {
      if (!old) return old
      const other = mode === 'completed' ? 'skipped' : 'completed'
      return {
        ...old,
        [mode]: old[mode].includes(key)
          ? old[mode].filter((item) => item !== key)
          : [...old[mode], key],
        [other]: old[other].filter((item) => item !== key),
      }
    })
    setDirty(true)
    setNotice('')
  }
  async function copy(text: string) {
    try {
      await navigator.clipboard.writeText(text)
      setNotice('Copied. Paste it on LinkedIn, then mark the section complete.')
    } catch {
      setError(
        'Copy is unavailable in this browser. Select the text and copy it manually.',
      )
    }
  }
  function taskControls(key: string, text?: string) {
    return (
      <div className="mt-4 flex flex-wrap items-center gap-3">
        {text && (
          <button
            className={secondary}
            type="button"
            onClick={() => void copy(text)}
          >
            Copy text
          </button>
        )}
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink">
          <input
            type="checkbox"
            checked={draft?.completed.includes(key) ?? false}
            onChange={() => mark(key, 'completed')}
            className="size-4 accent-teal"
          />
          Updated on LinkedIn
        </label>
        <label className="flex min-h-11 items-center gap-2 text-sm text-ink-muted">
          <input
            type="checkbox"
            checked={draft?.skipped.includes(key) ?? false}
            onChange={() => mark(key, 'skipped')}
            className="size-4 accent-teal"
          />
          Not applicable
        </label>
      </div>
    )
  }
  const canContinue =
    setup.source === 'career' ||
    (!!draft?.imported &&
      confirmed &&
      conflicts.every((entry) => acknowledged.includes(entry.id)))
  const percent =
    draft?.output && profile
      ? completion(
          checklistKeys(draft.output, profile),
          draft.completed,
          draft.skipped,
        )
      : 0
  const mask = (text: string | null | undefined) =>
    publicText(text, draft?.setup?.omitTerms ?? []).replace(
      /\[private\]/g,
      'Not shared',
    )

  return (
    <PageShell
      title="LinkedIn Optimization"
      subtitle="Turn your career facts into a clear professional story for the Middle East."
      icon={IdentificationIcon}
      width="wide"
      className="linkedin-workspace"
      uses={['Career Profile', 'career goals']}
    >
      {error && (
        <div
          role="alert"
          className="rounded-ctl border border-red-200 bg-red-50 p-4 text-sm text-red-800"
        >
          {error}{' '}
          <button className="ml-2 underline" onClick={() => void load()}>
            Refresh saved data
          </button>
        </div>
      )}
      {notice && (
        <p
          role="status"
          className="rounded-ctl bg-teal-soft p-4 text-sm text-ink"
        >
          {notice}
        </p>
      )}
      {loading ? (
        <p role="status" className={card}>
          Loading your Career Profile and saved draft…
        </p>
      ) : missingProfile ? (
        <section className={card}>
          <h2 className="type-section text-ink">
            Start with your Career Profile
          </h2>
          <p className="mt-3 leading-7 text-ink-soft">
            Upload your resume, paste its text, or enter your details. Review
            and save those facts before preparing your LinkedIn profile.
          </p>
          <Link href="/profile" className={`${primary} mt-5`}>
            Open Career Profile
          </Link>
        </section>
      ) : !profile ? (
        <button className={primary} onClick={() => void load(true)}>
          Try again
        </button>
      ) : (
        <>
          {busy && busy !== 'save' && (
            <section
              role="status"
              aria-live="polite"
              className={`${card} flex flex-col items-center gap-4 py-10 text-center`}
            >
              <ProcessingOrbit size={90} />
              <h2 className="type-section text-ink">
                {busy === 'import'
                  ? 'Reading your profile'
                  : 'Preparing and checking your content'}
              </h2>
              <p className="max-w-lg text-ink-soft">
                {busy === 'import'
                  ? 'You’ll review the extracted details before they are used.'
                  : 'Your confirmed facts, discipline and goals guide the writing. We check the result before saving it.'}
              </p>
            </section>
          )}
          {!busy || busy === 'save' ? (
            <>
              {view === 'preview' && draft?.output ? (
                <>
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <button
                      onClick={() => setView('results')}
                      className={secondary}
                    >
                      ← Back to your content
                    </button>
                    <span className="text-sm text-ink-muted">
                      {dirty
                        ? 'Preview includes unsaved edits'
                        : 'Saved content preview'}
                    </span>
                  </div>
                  {stale && (
                    <p className="rounded-ctl border border-amber-200 bg-amber-50 p-4 text-sm text-ink">
                      This saved content predates your latest Career Profile
                      changes. Review it before copying or prepare a fresh
                      version.
                    </p>
                  )}
                  <ProfilePreview profile={profile} draft={draft} />
                </>
              ) : view === 'results' && draft?.output ? (
                <fieldset
                  className="min-w-0 space-y-5"
                  disabled={busy === 'save'}
                >
                  <section
                    className={`${card} flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between`}
                  >
                    <div>
                      <p className="text-sm font-semibold text-teal">
                        YOUR PERSONALIZED CONTENT
                      </p>
                      <h2 className="mt-2 type-section text-ink">
                        Ready to make your profile yours
                      </h2>
                      <p className="mt-2 max-w-xl text-ink-soft">
                        Review, copy and paste each section on LinkedIn. Mark it
                        complete only after you’ve made the change.
                      </p>
                    </div>
                    <button
                      className={primary}
                      onClick={() => {
                        setView('preview')
                        window.scrollTo({ top: 0 })
                      }}
                    >
                      <EyeIcon className="size-5" />
                      Preview your optimized profile
                    </button>
                  </section>
                  {stale && (
                    <p className="rounded-ctl border border-amber-200 bg-amber-50 p-4 text-sm text-ink">
                      Career Profile has changed since this content was
                      generated. Review the saved version and generate a fresh
                      version to use your latest facts.
                    </p>
                  )}
                  <section className={card}>
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="font-semibold text-ink">
                        Your LinkedIn update progress
                      </h2>
                      <span className="text-xl font-semibold text-teal">
                        {percent}%
                      </span>
                    </div>
                    <div
                      role="progressbar"
                      aria-label="LinkedIn update checklist"
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-valuenow={percent}
                      className="mt-3 h-2 overflow-hidden rounded-full bg-canvas"
                    >
                      <div
                        className="h-full rounded-full bg-teal"
                        style={{ width: `${percent}%` }}
                      />
                    </div>
                    <p className="mt-3 text-sm text-ink-muted">
                      Based on sections you confirm as updated. This is a
                      checklist, not a hiring score.
                    </p>
                    <div className="mt-4 flex flex-wrap gap-3">
                      <button
                        className={primary}
                        disabled={!dirty || !!busy}
                        onClick={() => void save()}
                      >
                        {busy === 'save'
                          ? 'Saving…'
                          : dirty
                            ? 'Save changes'
                            : 'Changes saved'}
                      </button>
                      <button
                        className={secondary}
                        disabled={dirty || !!busy}
                        onClick={() => {
                          setView('setup')
                          setStage(1)
                          setSetup({
                            ...draft.setup!,
                            experienceIds: draft.setup!.experienceIds.filter(
                              (id) =>
                                profile.work_experience.some(
                                  (entry) => entry.id === id,
                                ),
                            ),
                          })
                          setError('')
                        }}
                      >
                        Prepare another version
                      </button>
                    </div>
                    {dirty && (
                      <p className="mt-2 text-sm text-ink-muted">
                        Save your edits and checklist before leaving this page.
                      </p>
                    )}
                  </section>
                  <section className={card}>
                    <h2 className="type-section text-ink">Headline</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      Open your profile, select the pencil in your introduction,
                      and replace the Headline field. Choose one option below.
                    </p>
                    <div className="mt-5 space-y-4">
                      {draft.output.headlines.map((headline, index) => (
                        <div
                          key={index}
                          className="rounded-ctl border border-line p-4"
                        >
                          <label className="flex items-center gap-2 text-sm font-semibold text-ink">
                            <input
                              type="radio"
                              name="headline"
                              checked={draft.selected_headline === index}
                              onChange={() =>
                                edit('headline', (old) => ({
                                  ...old,
                                  selected_headline: index,
                                }))
                              }
                              className="accent-teal"
                            />
                            Option {index + 1}
                          </label>
                          <textarea
                            aria-label={`Headline option ${index + 1}`}
                            className={`${input} mt-3`}
                            rows={2}
                            maxLength={FIELD_LIMITS.headline}
                            value={headline}
                            onChange={(e) =>
                              edit('headline', (old) => ({
                                ...old,
                                output: {
                                  ...old.output!,
                                  headlines: old.output!.headlines.map(
                                    (text, i) =>
                                      i === index ? e.target.value : text,
                                  ),
                                },
                              }))
                            }
                          />
                          <p className="mt-1 text-xs text-ink-muted">
                            {Array.from(headline).length}/
                            {FIELD_LIMITS.headline} characters
                          </p>
                        </div>
                      ))}
                    </div>
                    {taskControls(
                      'headline',
                      draft.output.headlines[draft.selected_headline],
                    )}
                  </section>
                  <section className={card}>
                    <h2 className="type-section text-ink">About</h2>
                    <p className="mt-2 text-sm leading-6 text-ink-soft">
                      Use the pencil beside About on your profile. If it’s
                      missing, add it through Add profile section.
                    </p>
                    <textarea
                      aria-label="About content"
                      className={`${input} mt-4 leading-7`}
                      rows={10}
                      value={draft.output.about}
                      maxLength={FIELD_LIMITS.about}
                      onChange={(e) =>
                        edit('about', (old) => ({
                          ...old,
                          output: { ...old.output!, about: e.target.value },
                        }))
                      }
                    />
                    <p className="mt-1 text-xs text-ink-muted">
                      {Array.from(draft.output.about).length}/
                      {FIELD_LIMITS.about} characters
                    </p>
                    {taskControls('about', draft.output.about)}
                  </section>
                  {draft.output.experience.map((entry) => {
                    const role = profile.work_experience.find(
                      (item) => item.id === entry.id,
                    )
                    return (
                      <section key={entry.id} className={card}>
                        <p className="text-sm font-semibold text-teal">
                          EXPERIENCE
                        </p>
                        <h2 className="mt-2 type-section text-ink">
                          {mask(role?.role)} · {mask(role?.company)}
                        </h2>
                        <p className="mt-2 text-sm text-ink-muted">
                          {role?.start_date?.slice(0, 7)} –{' '}
                          {role?.end_date?.slice(0, 7) ?? 'Present'} · Titles,
                          employers and dates come from Career Profile.
                        </p>
                        <p className="mt-3 text-sm leading-6 text-ink-soft">
                          Edit this role in LinkedIn’s Experience section and
                          paste only the description below. Check the fixed job
                          fields against Career Profile.
                        </p>
                        <textarea
                          aria-label={`Experience ${entry.id}`}
                          className={`${input} mt-4 leading-7`}
                          rows={7}
                          maxLength={FIELD_LIMITS.experience}
                          value={entry.description}
                          onChange={(e) =>
                            edit(`experience:${entry.id}`, (old) => ({
                              ...old,
                              output: {
                                ...old.output!,
                                experience: old.output!.experience.map(
                                  (item) =>
                                    item.id === entry.id
                                      ? { ...item, description: e.target.value }
                                      : item,
                                ),
                              },
                            }))
                          }
                        />
                        <p className="mt-1 text-xs text-ink-muted">
                          {Array.from(entry.description).length}/
                          {FIELD_LIMITS.experience} characters
                        </p>
                        {taskControls(
                          `experience:${entry.id}`,
                          entry.description,
                        )}
                      </section>
                    )
                  })}
                  {!!draft.output.skills.length && (
                    <section className={card}>
                      <h2 className="type-section text-ink">
                        Skills to emphasize
                      </h2>
                      <p className="mt-2 text-sm leading-6 text-ink-soft">
                        Add these saved skills individually in LinkedIn’s Skills
                        section. Put the most relevant first.
                      </p>
                      <div className="mt-4 flex flex-wrap gap-2">
                        {draft.output.skills.map((skill) => (
                          <button
                            key={skill}
                            className={secondary}
                            onClick={() => void copy(skill)}
                            aria-label={`Copy skill ${skill}`}
                          >
                            {skill}
                          </button>
                        ))}
                      </div>
                      {taskControls('skills', draft.output.skills.join('\n'))}
                    </section>
                  )}
                  {!!profile.education.length && (
                    <section className={card}>
                      <h2 className="type-section text-ink">Education</h2>
                      <p className="mt-2 text-sm text-ink-soft">
                        Add or edit each qualification in Education. Copy the
                        values into the matching fields.
                      </p>
                      {profile.education.map((item) => (
                        <div
                          key={item.id}
                          className="mt-4 rounded-ctl bg-canvas p-4"
                        >
                          <p className="font-semibold text-ink">
                            {mask(item.institution)}
                          </p>
                          <p className="text-ink-soft">
                            {mask(item.degree)} · {mask(item.field_of_study)}
                          </p>
                          <button
                            className={`${secondary} mt-3`}
                            onClick={() =>
                              void copy(
                                [
                                  `School: ${mask(item.institution)}`,
                                  `Degree: ${mask(item.degree)}`,
                                  `Field of study: ${mask(item.field_of_study)}`,
                                  `Dates: ${item.start_year ?? 'Not provided'} – ${item.end_year ?? 'Not provided'}`,
                                ].join('\n'),
                              )
                            }
                          >
                            Copy education fields
                          </button>
                        </div>
                      ))}
                      {taskControls('education')}
                    </section>
                  )}
                  {!!profile.certifications.length && (
                    <section className={card}>
                      <h2 className="type-section text-ink">
                        Licences & certifications
                      </h2>
                      <p className="mt-2 text-sm text-ink-soft">
                        Use Add profile section → Recommended → Add licences &
                        certifications. Enter only the credentials you hold.
                      </p>
                      {profile.certifications.map((item) => (
                        <div
                          key={item.id}
                          className="mt-4 rounded-ctl bg-canvas p-4"
                        >
                          <p className="font-semibold text-ink">
                            {mask(item.name)}
                          </p>
                          <p className="text-ink-soft">{mask(item.issuer)}</p>
                          <button
                            className={`${secondary} mt-3`}
                            onClick={() =>
                              void copy(
                                `Name: ${mask(item.name)}\nIssuing organization: ${mask(item.issuer)}\nIssue date: ${item.issue_date?.slice(0, 7) ?? 'Not provided'}`,
                              )
                            }
                          >
                            Copy certification fields
                          </button>
                        </div>
                      ))}
                      {taskControls('certifications')}
                    </section>
                  )}
                  <section className={card}>
                    <h2 className="type-section text-ink">
                      Your advisor’s recommendations
                    </h2>
                    <ul className="mt-4 space-y-3">
                      {draft.output.advice.map((tip, index) => (
                        <li key={index} className="flex gap-3">
                          <CheckIcon className="mt-1 size-5 shrink-0 text-teal" />
                          <p className="leading-7 text-ink-soft">{tip}</p>
                        </li>
                      ))}
                    </ul>
                  </section>
                  <section className={card}>
                    <h2 className="type-section text-ink">
                      Finish the presentation
                    </h2>
                    <p className="mt-3 leading-7 text-ink-soft">
                      Use a clear professional photo and a relevant banner.
                      Review your profile’s visibility and contact settings. Add
                      genuine work samples to Featured only when you have
                      permission to share them.
                    </p>
                    <p className="mt-3 text-sm text-ink-muted">
                      You control what appears on LinkedIn. No account password
                      or direct account access is needed.
                    </p>
                    {taskControls('presentation')}
                  </section>
                  <p className="text-sm text-ink-muted">
                    Career facts need correcting?{' '}
                    <Link
                      href="/profile"
                      className="font-semibold text-teal underline"
                    >
                      Update Career Profile
                    </Link>
                    , then prepare a fresh version here.
                  </p>
                </fieldset>
              ) : (
                <>
                  {stage === 0 && (
                    <section className="ui-surface grid min-w-0 overflow-hidden rounded-card border border-line bg-white md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
                      <div className="min-w-0 p-4 sm:p-9">
                        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-teal">
                          YOUR NEXT CHAPTER, CLEARLY TOLD
                        </p>
                        <h2 className="mt-3 max-w-lg type-marketing-title text-ink sm:mt-4">
                          Make your experience easier to discover.
                        </h2>
                        <p className="mt-3 max-w-lg type-body text-ink-soft sm:mt-4">
                          For careers across the Gulf, a clear headline,
                          credible experience and relevant skills help
                          recruiters understand where you fit. We shape your
                          story around your field and goals.
                        </p>
                        <blockquote className="mt-6 border-l-2 border-teal pl-4 text-lg font-medium text-ink">
                          “Your real experience. A clearer professional story.”
                        </blockquote>
                        <p className="mt-1 pl-4 text-xs text-ink-muted">
                          The GCC Mentor approach
                        </p>
                        <a
                          href="https://www.linkedin.com/help/recruiter/answer/a6508895"
                          target="_blank"
                          rel="noreferrer"
                          className="mt-5 block text-xs leading-6 text-ink-muted underline"
                        >
                          LinkedIn Recruiter search supports criteria such as
                          skills, job titles, location and industry. No hiring
                          outcome is guaranteed.
                        </a>
                      </div>
                      <Image
                        width={960}
                        height={960}
                        src="/landing/who-any-profession.jpg"
                        alt="Professionals preparing for their next career opportunity"
                        className="h-48 w-full object-cover md:h-full"
                      />
                    </section>
                  )}
                  <nav
                    aria-label="Preparation steps"
                    className="flex flex-wrap gap-3 text-sm"
                  >
                    {[
                      'Choose your source',
                      'Define your direction',
                      'Review & prepare',
                    ].map((label, index) => (
                      <span
                        key={label}
                        aria-current={stage === index ? 'step' : undefined}
                        className={`rounded-full px-4 py-2 ${stage === index ? 'bg-teal text-white' : 'bg-white text-ink-muted'}`}
                      >
                        {index + 1}. {label}
                      </span>
                    ))}
                  </nav>
                  {stage === 0 ? (
                    <section className={card}>
                      <h2 className="type-section text-ink">
                        Where should we start?
                      </h2>
                      <p className="mt-2 leading-7 text-ink-soft">
                        Your saved Career Profile supplies the facts. An
                        existing LinkedIn profile is optional comparison
                        material.
                      </p>
                      <div className="mt-5 grid gap-3 md:grid-cols-3">
                        {(
                          [
                            {
                              value: 'career',
                              label: 'Use Career Profile',
                              detail:
                                'Start with the information you already saved.',
                              icon: UserCircleIcon,
                            },
                            {
                              value: 'upload',
                              label: 'Upload LinkedIn profile',
                              detail:
                                'Upload a profile PDF. DOCX is also supported.',
                              icon: ArrowUpTrayIcon,
                            },
                            {
                              value: 'paste',
                              label: 'Paste LinkedIn profile',
                              detail:
                                'Copy your existing profile sections here.',
                              icon: DocumentTextIcon,
                            },
                          ] as const
                        ).map((option) => (
                          <button
                            key={option.value}
                            onClick={() => {
                              changeSetup('source', option.value)
                              setConfirmed(false)
                              setAcknowledged([])
                              if (option.value !== 'career')
                                changeSetup('mode', 'existing')
                            }}
                            aria-pressed={setup.source === option.value}
                            className={`min-w-0 rounded-ctl border p-4 text-left [overflow-wrap:anywhere] sm:p-5 ${setup.source === option.value ? 'border-teal bg-teal-soft' : 'border-line bg-white hover:bg-canvas'}`}
                          >
                            <option.icon className="size-6 text-teal" />
                            <span className="mt-3 block font-semibold text-ink">
                              {option.label}
                            </span>
                            <span className="mt-2 block text-sm leading-6 text-ink-soft">
                              {option.detail}
                            </span>
                          </button>
                        ))}
                      </div>
                      {setup.source === 'career' ? (
                        <div className="mt-6">
                          <Field
                            label="What are you preparing?"
                            help="We prepare content for you to use. You create or edit the account yourself."
                          >
                            <select
                              className={input}
                              value={setup.mode}
                              onChange={(e) =>
                                changeSetup(
                                  'mode',
                                  e.target.value as LinkedInSetup['mode'],
                                )
                              }
                            >
                              <option value="existing">
                                Improve my existing LinkedIn profile
                              </option>
                              <option value="new">
                                Prepare my first LinkedIn profile
                              </option>
                            </select>
                          </Field>
                          <p className="mt-4 text-sm text-ink-soft">
                            Using {profile.full_name}’s saved Career Profile. No
                            upload is required.
                          </p>
                        </div>
                      ) : (
                        <div className="mt-6 space-y-4">
                          {setup.source === 'upload' ? (
                            <>
                              <Field label="Your LinkedIn profile PDF or DOCX">
                                <input
                                  aria-label="LinkedIn profile file"
                                  className={input}
                                  type="file"
                                  accept=".pdf,.docx"
                                  onChange={(e) =>
                                    setFile(e.target.files?.[0] ?? null)
                                  }
                                />
                              </Field>
                              <p className="text-sm leading-6 text-ink-muted">
                                On desktop LinkedIn: Me → View profile → More or
                                Resources → Save to PDF. This option may not
                                appear for every member and isn’t available in
                                the mobile app. On your phone, paste your
                                profile text or use Career Profile.
                              </p>
                              <a
                                className="text-sm text-teal underline"
                                href="https://www.linkedin.com/help/linkedin/answer/a541960"
                                target="_blank"
                                rel="noreferrer"
                              >
                                LinkedIn’s download instructions
                              </a>
                            </>
                          ) : (
                            <Field
                              label="Paste your LinkedIn profile"
                              help="Include About and Experience. 100–30,000 characters. Do not paste passwords or identity documents."
                            >
                              <textarea
                                className={input}
                                rows={8}
                                maxLength={30000}
                                value={pasted}
                                onChange={(e) => setPasted(e.target.value)}
                              />
                            </Field>
                          )}
                          <p className="text-sm text-ink-muted">
                            This path is for an existing LinkedIn profile. If
                            you have an ordinary CV or need a first profile,
                            choose Use Career Profile.
                          </p>
                          <button
                            className={secondary}
                            onClick={() => void importProfile()}
                          >
                            Read and compare profile
                          </button>
                          {draft?.imported && (
                            <section className="space-y-4 rounded-ctl border border-line bg-canvas p-4">
                              <h3 className="font-semibold text-ink">
                                Review extracted information
                              </h3>
                              <p className="text-sm text-ink-soft">
                                {draft.imported.fullName ||
                                  'Name not identified'}{' '}
                                · {draft.imported.experience.length} roles found
                              </p>
                              <p className="whitespace-pre-wrap text-sm leading-6 text-ink-soft">
                                {draft.imported.summary ||
                                  'No About section was identified.'}
                              </p>
                              {draft.imported.experience.map((entry, i) => (
                                <p key={i} className="text-sm text-ink-soft">
                                  {entry.role} · {entry.company} ·{' '}
                                  {entry.start?.slice(0, 7) ?? 'Unknown start'}{' '}
                                  – {entry.end?.slice(0, 7) ?? 'Present'}
                                </p>
                              ))}
                              {draft.imported.warnings.map((warning, i) => (
                                <p key={i} className="text-sm text-amber-800">
                                  {warning}
                                </p>
                              ))}
                              <label className="flex items-start gap-3 text-sm text-ink">
                                <input
                                  className="mt-1 size-4 shrink-0 accent-teal"
                                  type="checkbox"
                                  checked={confirmed}
                                  onChange={(e) =>
                                    setConfirmed(e.target.checked)
                                  }
                                />
                                I reviewed this extraction and confirm this is
                                my own LinkedIn profile. Career Profile will
                                supply the career facts.
                              </label>
                              {conflicts.map((conflict) => (
                                <div
                                  key={conflict.id}
                                  className="rounded-ctl border border-amber-200 bg-white p-4"
                                >
                                  <h4 className="text-sm font-semibold text-ink">
                                    {conflict.label}
                                  </h4>
                                  <p className="mt-2 break-words text-sm text-ink-soft">
                                    Career Profile: {conflict.profileValue}
                                  </p>
                                  <p className="mt-1 break-words text-sm text-ink-soft">
                                    Imported: {conflict.importedValue}
                                  </p>
                                  <label className="mt-3 flex items-start gap-3 text-sm text-ink">
                                    <input
                                      type="checkbox"
                                      className="mt-1 size-4 shrink-0 accent-teal"
                                      checked={acknowledged.includes(
                                        conflict.id,
                                      )}
                                      onChange={(e) =>
                                        setAcknowledged((old) =>
                                          e.target.checked
                                            ? [...old, conflict.id]
                                            : old.filter(
                                                (id) => id !== conflict.id,
                                              ),
                                        )
                                      }
                                    />
                                    {conflict.id === 'identity'
                                      ? 'This is my own profile; use my saved Career Profile name.'
                                      : 'Use Career Profile for this detail; ignore the imported difference.'}
                                  </label>
                                </div>
                              ))}
                              <p className="text-sm text-ink-muted">
                                If the imported detail is correct,{' '}
                                <Link
                                  className="text-teal underline"
                                  href="/profile"
                                >
                                  correct Career Profile
                                </Link>{' '}
                                first, then{' '}
                                <button
                                  className="text-teal underline"
                                  onClick={() => void load()}
                                >
                                  refresh here
                                </button>
                                . Importing does not change your saved career
                                data.
                              </p>
                            </section>
                          )}
                        </div>
                      )}
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          className={primary}
                          disabled={!canContinue}
                          onClick={() => setStage(1)}
                        >
                          Continue
                        </button>
                        {draft?.output && (
                          <button
                            className={secondary}
                            onClick={() => setView('results')}
                          >
                            Return to saved content
                          </button>
                        )}
                      </div>
                    </section>
                  ) : stage === 1 ? (
                    <section className={card}>
                      <h2 className="type-section text-ink">
                        Give your advisor a direction
                      </h2>
                      <p className="mt-2 leading-7 text-ink-soft">
                        We adapt the content to your actual discipline and
                        experience. Target roles guide positioning; they never
                        become invented experience.
                      </p>
                      <div className="mt-6 grid gap-5 sm:grid-cols-2">
                        <Field label="Your main goal">
                          <select
                            className={input}
                            value={setup.goal}
                            onChange={(e) =>
                              changeSetup(
                                'goal',
                                e.target.value as LinkedInSetup['goal'],
                              )
                            }
                          >
                            <option value="job">
                              Find a role in the Middle East
                            </option>
                            <option value="promotion">
                              Position for career progression
                            </option>
                            <option value="change">
                              Move into another field
                            </option>
                            <option value="presence">
                              Strengthen my professional presence
                            </option>
                          </select>
                        </Field>
                        <Field
                          label="Target role or roles"
                          help="Required. Use your own discipline and level."
                        >
                          <input
                            className={input}
                            maxLength={240}
                            value={setup.targetRoles}
                            onChange={(e) =>
                              changeSetup('targetRoles', e.target.value)
                            }
                            placeholder="For example: Staff Nurse, Finance Analyst"
                          />
                        </Field>
                        <Field label="Target industry (optional)">
                          <input
                            className={input}
                            maxLength={240}
                            value={setup.industries}
                            onChange={(e) =>
                              changeSetup('industries', e.target.value)
                            }
                          />
                        </Field>
                        <Field label="Target countries (optional)">
                          <input
                            className={input}
                            maxLength={240}
                            value={setup.countries}
                            onChange={(e) =>
                              changeSetup('countries', e.target.value)
                            }
                            placeholder="For example: UAE, Saudi Arabia"
                          />
                        </Field>
                        <Field label="Content language">
                          <select
                            className={input}
                            value={setup.language}
                            onChange={(e) =>
                              changeSetup(
                                'language',
                                e.target.value as LinkedInSetup['language'],
                              )
                            }
                          >
                            <option>English</option>
                            <option>Arabic</option>
                          </select>
                        </Field>
                        <Field label="Writing tone">
                          <select
                            className={input}
                            value={setup.tone}
                            onChange={(e) =>
                              changeSetup(
                                'tone',
                                e.target.value as LinkedInSetup['tone'],
                              )
                            }
                          >
                            <option value="professional">
                              Professional and clear
                            </option>
                            <option value="approachable">
                              Warm and approachable
                            </option>
                            <option value="technical">
                              Technical and precise
                            </option>
                          </select>
                        </Field>
                      </div>
                      {!!profile.work_experience.length && (
                        <fieldset className="mt-6">
                          <legend className="text-sm font-semibold text-ink">
                            Experience to include (up to 12 roles)
                          </legend>
                          <p className="mt-2 text-sm text-ink-muted">
                            All selected roles receive their own description.
                            Choose those most relevant to your direction.
                          </p>
                          <div className="mt-3 space-y-3">
                            {profile.work_experience.map((entry) => (
                              <label
                                key={entry.id}
                                className="flex items-start gap-3 rounded-ctl border border-line p-3 text-sm text-ink"
                              >
                                <input
                                  type="checkbox"
                                  className="mt-1 size-4 shrink-0 accent-teal"
                                  checked={setup.experienceIds.includes(
                                    entry.id,
                                  )}
                                  disabled={
                                    !setup.experienceIds.includes(entry.id) &&
                                    setup.experienceIds.length >= 12
                                  }
                                  onChange={(e) =>
                                    changeSetup(
                                      'experienceIds',
                                      e.target.checked
                                        ? [...setup.experienceIds, entry.id]
                                        : setup.experienceIds.filter(
                                            (id) => id !== entry.id,
                                          ),
                                    )
                                  }
                                />
                                {entry.role} · {entry.company}
                              </label>
                            ))}
                          </div>
                        </fieldset>
                      )}
                      <div className="mt-6 space-y-5">
                        <Field
                          label="Target job descriptions (optional)"
                          help="Audience context only. We won’t claim skills or achievements from an advert."
                        >
                          <textarea
                            className={input}
                            rows={5}
                            maxLength={12000}
                            value={setup.jobDescriptions}
                            onChange={(e) =>
                              changeSetup('jobDescriptions', e.target.value)
                            }
                          />
                        </Field>
                        <Field
                          label="Anything your advisor should know? (optional)"
                          help="Give wording preferences or priorities. Add new career facts to Career Profile before generating."
                        >
                          <textarea
                            className={input}
                            rows={4}
                            maxLength={1500}
                            value={setup.instructions}
                            onChange={(e) =>
                              changeSetup('instructions', e.target.value)
                            }
                          />
                        </Field>
                        <Field
                          label="Names or terms to keep private (optional)"
                          help="One exact term per line, up to 20. For example, a confidential client name. Contact details, identity numbers, birth dates and visa data are excluded by default."
                        >
                          <textarea
                            className={input}
                            rows={3}
                            maxLength={1600}
                            value={setup.omitTerms.join('\n')}
                            onChange={(e) =>
                              changeSetup(
                                'omitTerms',
                                e.target.value.split('\n').slice(0, 20),
                              )
                            }
                          />
                        </Field>
                      </div>
                      <div className="mt-6 flex gap-3">
                        <button
                          className={secondary}
                          onClick={() => setStage(0)}
                        >
                          Back
                        </button>
                        <button
                          className={primary}
                          disabled={!setup.targetRoles.trim() || !canContinue}
                          onClick={() => setStage(2)}
                        >
                          Review setup
                        </button>
                      </div>
                    </section>
                  ) : (
                    <section className={card}>
                      <h2 className="type-section text-ink">
                        Your personalized brief
                      </h2>
                      <dl className="mt-5 grid gap-5 sm:grid-cols-2">
                        {[
                          ['Career facts', profile.full_name],
                          ['Direction', setup.targetRoles],
                          [
                            'Industry',
                            setup.industries ||
                              'Based on your saved experience',
                          ],
                          [
                            'Audience',
                            setup.countries || 'Middle East careers',
                          ],
                          ['Style', `${setup.language} · ${setup.tone}`],
                          [
                            'Experience',
                            `${setup.experienceIds.length} selected roles`,
                          ],
                        ].map(([label, value]) => (
                          <div key={label}>
                            <dt className="text-sm text-ink-muted">{label}</dt>
                            <dd className="mt-1 break-words font-medium text-ink">
                              {value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      <p className="mt-6 rounded-ctl bg-teal-soft p-4 text-sm leading-6 text-ink">
                        Your advisor will prepare headlines, About, experience
                        descriptions, saved skills and tailored advice. We
                        fact-check the writing before saving it. You’ll make the
                        changes on LinkedIn yourself.
                      </p>
                      {draft?.output && (
                        <p className="mt-4 text-sm text-amber-800">
                          Generating a new version replaces this draft’s saved
                          content and resets its checklist only when generation
                          succeeds.
                        </p>
                      )}
                      <div className="mt-6 flex flex-wrap gap-3">
                        <button
                          className={secondary}
                          onClick={() => setStage(1)}
                        >
                          Back
                        </button>
                        <button
                          className={primary}
                          disabled={!canContinue}
                          onClick={() => void generate()}
                        >
                          Optimize LinkedIn
                        </button>
                      </div>
                    </section>
                  )}
                </>
              )}
            </>
          ) : null}
        </>
      )}
    </PageShell>
  )
}
