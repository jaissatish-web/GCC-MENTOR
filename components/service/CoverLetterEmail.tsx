'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/Button'

/** Email-style reading surface; the original text remains the copy/save source. */
export function CoverLetterEmail({ text, jobTitle, company, onChange }: {
  text: string
  jobTitle: string
  company: string | null
  onChange: (text: string) => void
}) {
  const [editing, setEditing] = useState(false)
  return (
    <section className="cover-letter-email" aria-label="Application email preview">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line px-3 py-2 sm:px-5">
        <span className="type-label font-semibold text-teal">Application email</span>
        <Button type="button" variant="ghost" size="sm" aria-pressed={editing} onClick={() => setEditing(!editing)}>
          {editing ? 'Preview email' : 'Edit letter'}
        </Button>
      </div>
      <dl className="cover-letter-email-fields">
        <div><dt>To</dt><dd>{company ? `Hiring team · ${company}` : 'Hiring Manager'}</dd></div>
        <div><dt>Subject</dt><dd>{jobTitle ? `Application for ${jobTitle}` : 'Job application'}</dd></div>
      </dl>
      {editing ? (
        <textarea className="cover-letter-email-editor" aria-label="Cover letter text (editable)" value={text}
          onChange={(event) => onChange(event.target.value)} rows={20} />
      ) : (
        <div className="cover-letter-email-body">
          {text.split(/\r?\n\s*\r?\n/).map((paragraph, index) => <p key={index}>{paragraph}</p>)}
        </div>
      )}
    </section>
  )
}
