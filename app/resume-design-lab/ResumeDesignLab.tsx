'use client'

import { useMemo, useState } from 'react'
import { ResumeDocumentView } from '@/components/resume/ResumeDocumentView'
import { buildCareerProfileResume } from '@/lib/careerProfileResume'
import { makeQualitySample, SAMPLE_PATTERNS, SAMPLE_PROFESSIONS } from '@/lib/resumeQualitySamples'
import { getTemplate, type TemplateId } from '@/lib/templates'
import { cn } from '@/lib/utils'

const DESIGNS: TemplateId[] = ['ats_professional', 'gcc_professional', 'senior_professional']
const SECTIONS = [['summary', 'Summary'], ['skills', 'Skills'], ['experience', 'Experience'], ['education', 'Education'], ['certifications', 'Certifications'], ['additional', 'Projects & other sections']] as const

export function ResumeDesignLab() {
  const [profession, setProfession] = useState(0)
  const [pattern, setPattern] = useState(2)
  const [variation, setVariation] = useState(2)
  const [template, setTemplate] = useState<TemplateId>('gcc_professional')
  const [headline, setHeadline] = useState<string | null>(null)
  const [showHeadline, setShowHeadline] = useState(true)
  const [hidden, setHidden] = useState<string[]>([])
  const profile = useMemo(() => makeQualitySample(profession, pattern, variation), [profession, pattern, variation])
  const source = useMemo(() => buildCareerProfileResume(profile), [profile])
  const document = {
    ...source,
    header: { ...source.header, targetJobTitle: showHeadline ? headline ?? source.header.targetJobTitle : '' },
    summary: hidden.includes('summary') ? '' : source.summary,
    skills: hidden.includes('skills') ? [] : source.skills,
    experience: hidden.includes('experience') ? [] : source.experience,
    education: hidden.includes('education') ? [] : source.education,
    certifications: hidden.includes('certifications') ? [] : source.certifications,
    additional: hidden.includes('additional') ? [] : source.additional,
  }
  const Template = getTemplate(template).component
  const switchSample = (change: () => void) => { change(); setHeadline(null); setShowHeadline(true); setHidden([]) }
  return (
    <main className="min-h-dvh bg-canvas px-3 py-5 text-ink sm:px-6 sm:py-8">
      <div className="mx-auto max-w-[1280px]">
        <header className="mb-5 flex flex-wrap items-end justify-between gap-3">
          <div><p className="type-caption font-semibold uppercase tracking-wider text-teal">GCC Mentor · Resume review</p><h1 className="mt-1 text-2xl font-semibold tracking-tight sm:text-3xl">A clear resume. Your information. Your choices.</h1><p className="mt-2 max-w-2xl type-helper text-ink-soft">Compare the new designs with invented samples from 20 professions. Adjust the headline and visible sections to inspect the layout.</p></div>
          <span className="rounded-full border border-teal/20 bg-teal-soft px-3 py-1.5 type-caption font-semibold text-teal">Synthetic sample · Nothing is saved</span>
        </header>
        <div className="grid items-start gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
          <aside className="rounded-card border border-line bg-white p-4 shadow-sm lg:sticky lg:top-5">
            <h2 className="type-label font-semibold">Choose a sample</h2>
            <div className="mt-3 grid gap-3">
              <label className="type-helper font-semibold">Profession<select className="field mt-1 w-full" value={profession} onChange={e => switchSample(() => setProfession(Number(e.target.value)))}>{SAMPLE_PROFESSIONS.map(([title], i) => <option key={title} value={i}>{title}</option>)}</select></label>
              <label className="type-helper font-semibold">Career stage<select className="field mt-1 w-full" value={pattern} onChange={e => switchSample(() => setPattern(Number(e.target.value)))}>{SAMPLE_PATTERNS.map((title, i) => <option key={title} value={i}>{title}</option>)}</select></label>
              <label className="type-helper font-semibold">Content variation<select className="field mt-1 w-full" value={variation} onChange={e => switchSample(() => setVariation(Number(e.target.value)))}>{Array.from({ length: 20 }, (_, i) => <option key={i} value={i}>{i === 18 ? 'Long name & Arabic text' : i === 19 ? 'Long headline & detailed duties' : `Sample ${i + 1}`}</option>)}</select></label>
            </div>
            <fieldset className="mt-5 border-t border-line pt-4"><legend className="type-label font-semibold">Resume design</legend><div className="mt-2 flex flex-col gap-2">{DESIGNS.map(id => <label key={id} className={cn('flex min-h-11 cursor-pointer items-center gap-2 rounded-ctl border px-3 py-2 type-helper', template === id ? 'border-teal bg-teal-soft font-semibold text-teal' : 'border-line')}><input type="radio" name="design" checked={template === id} onChange={() => setTemplate(id)} className="accent-teal" />{getTemplate(id).name}</label>)}</div></fieldset>
            <label className="mt-5 block type-helper font-semibold">Headline beneath the name<input className="field mt-1 w-full" value={headline ?? source.header.targetJobTitle} maxLength={200} onChange={e => setHeadline(e.target.value)} /></label>
            <label className="flex min-h-11 items-center gap-2 type-helper"><input type="checkbox" checked={showHeadline} onChange={e => setShowHeadline(e.target.checked)} className="accent-teal" />Show headline</label>
            <fieldset className="mt-3 border-t border-line pt-3"><legend className="type-label font-semibold">Visible sections</legend>{SECTIONS.map(([key, label]) => <label key={key} className="flex min-h-11 items-center gap-2 type-helper"><input type="checkbox" checked={!hidden.includes(key)} onChange={e => setHidden(list => e.target.checked ? list.filter(k => k !== key) : [...list, key])} className="accent-teal" />{label}</label>)}</fieldset>
          </aside>
          <section className="min-w-0 rounded-card border border-line bg-white p-3 shadow-sm sm:p-5" aria-label="Resume preview">
            <div className="mb-3 flex flex-wrap justify-between gap-2"><p className="type-helper font-semibold">{getTemplate(template).name}</p><p className="type-caption text-ink-soft">A4 · Same renderer as the downloaded PDF</p></div>
            <ResumeDocumentView className="w-full bg-white"><Template document={document} profile={profile} optimizedContent={{ summary: { generated: '', source_profile_summary: '' }, experience_blocks: [] }} /></ResumeDocumentView>
          </section>
        </div>
      </div>
    </main>
  )
}
