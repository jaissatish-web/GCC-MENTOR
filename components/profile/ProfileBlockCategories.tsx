'use client'

import { useEffect, useState } from 'react'
import { CategoryEditor, type CategoryEditorEntry } from '@/components/profile/CategoryEditor'
import { PROFILE_BLOCKS, profileBlockForCategory } from '@/lib/careerProfileBlocks'
import { groupCategoryEntries } from '@/lib/profileCategories'

const button = 'min-h-11 rounded-ctl border border-line bg-white px-3 py-2 text-left text-sm font-semibold text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-40'

/** Open the matching original category without changing its name or stored order. */
export function focusProfileBlockCategory(blockId: string): void {
  const details = Array.from(document.querySelectorAll<HTMLDetailsElement>('#profile-category-editor details')).find(element => profileBlockForCategory(element.querySelector('summary')?.textContent ?? '') === blockId)
  if (details) {
    details.open = true
    details.scrollIntoView({ behavior: 'smooth', block: 'start' })
    details.querySelector<HTMLInputElement>('input')?.focus({ preventScroll: true })
    return
  }
  const button = document.getElementById(`profile-block-${blockId}`)
  button?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  button?.focus({ preventScroll: true })
}

/** Named starting points over the existing category storage. Never rewrites legacy headings. */
export function ProfileBlockCategories<T extends CategoryEditorEntry>({ value, onChange }: { value: T[]; onChange: (rows: T[]) => void }) {
  const [message, setMessage] = useState('')
  const [pendingBlock, setPendingBlock] = useState<string | null>(null)
  useEffect(() => {
    if (!pendingBlock) return
    focusProfileBlockCategory(pendingBlock)
    setPendingBlock(null)
  }, [pendingBlock, value])
  const groups = groupCategoryEntries(value)
  const specialistBlocks = PROFILE_BLOCKS.filter(block => block.categoryNames?.length)
  const addBlock = (id: string) => {
    const block = specialistBlocks.find(item => item.id === id)
    if (!block?.categoryNames?.length) return
    const existing = groups.find(group => profileBlockForCategory(group.name) === id)
    if (existing) {
      setMessage(`${block.title} is already below. Open its category to review your information.`)
      focusProfileBlockCategory(id)
      return
    }
    if (groups.length >= 30 || value.length >= 200) {
      setMessage('You have reached the category or item limit. You can edit an existing category below.')
      return
    }
    onChange([...value, {
      key: crypto.randomUUID(), category_id: crypto.randomUUID(), category_name: block.categoryNames[0],
      category_order: Math.max(-1, ...groups.map(group => group.order)) + 1,
      category_position: 'end', show_on_resume: true, label: '', value: '', level: '',
    } as T])
    setPendingBlock(id)
    setMessage(`${block.title} added below. Add only your actual details, then save your profile.`)
  }
  return <div className="space-y-4">
    <p className="field-hint">Add only the blocks that help showcase your background. Empty optional blocks do not reduce your score. Original resume headings and custom sections stay available below.</p>
    <div className="grid gap-2 sm:grid-cols-2">
      {specialistBlocks.map(block => {
        const count = groups.filter(group => profileBlockForCategory(group.name) === block.id).reduce((sum, group) => sum + group.items.filter(item => item.label.trim() || item.value.trim()).length, 0)
        const exists = groups.some(group => profileBlockForCategory(group.name) === block.id)
        return <button key={block.id} id={`profile-block-${block.id}`} type="button" className={button} onClick={() => addBlock(block.id)} aria-label={`${exists ? 'Review' : 'Add'} ${block.title}`}>
          <span className="block">{block.title}</span>
          <span className="mt-1 block text-xs font-normal text-ink-muted">{block.description}</span>
          <span className="mt-2 block text-xs text-teal">{exists ? `${count} item${count === 1 ? '' : 's'} · Review below` : '+ Add this block'}</span>
        </button>
      })}
    </div>
    <p role="status" aria-live="polite" className="field-hint">{message}</p>
    <div id="profile-category-editor" className="scroll-mt-4">
      <CategoryEditor value={value} onChange={onChange} />
    </div>
  </div>
}
