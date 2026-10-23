'use client'
import { useId, useState, type TextareaHTMLAttributes } from 'react'
import { PencilSquareIcon, CheckIcon } from '@heroicons/react/24/outline'

/** The same controlled value is displayed, edited, copied and saved by the workspace. */
export function EditableProfileText({ label, value, maxLength, rows, onChange, ...props }: Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'value'> & { label: string; value: string }) {
  const [editing, setEditing] = useState(false)
  const id = useId()
  return (
    <div className="profile-copy-surface mt-4" style={{ borderColor: '#D2DBE7' }}>
      <div className="profile-copy-toolbar" style={{ background: '#F6F8FB', borderColor: '#E9EDF2' }}>
        <span className="type-label font-medium text-[#0B1F3A]">{editing ? 'Make this sound like you' : 'Your copy-ready text'}</span>
        <button type="button" aria-expanded={editing} aria-controls={id} aria-label={`${editing ? 'Preview' : 'Edit'} ${label}`} onClick={() => setEditing(!editing)} className="profile-edit-button type-helper" style={{ color: '#0B1F3A' }}>
          {editing ? <CheckIcon aria-hidden="true" className="size-4" /> : <PencilSquareIcon aria-hidden="true" className="size-4" />}{editing ? 'Done editing' : 'Edit text'}
        </button>
      </div>
      <div id={id}>
        {editing ? <textarea {...props} dir="auto" aria-label={label} value={value} maxLength={maxLength} rows={rows} onChange={onChange} autoFocus className="field profile-text-editor" /> : <div className="profile-copy-text" dir="auto">{value || 'This section is empty. Select Edit text to add your wording.'}</div>}
      </div>
      {maxLength ? <p className="profile-copy-count type-caption text-ink-muted">{Array.from(value).length}/{maxLength} characters · Review before you copy</p> : null}
    </div>
  )
}