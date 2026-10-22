'use client'

import { useState } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { CATEGORY_POSITIONS, CATEGORY_POSITION_LABELS, categoryEditorCapacity, groupCategoryEntries, type CategoryMetadata } from '@/lib/profileCategories'

export interface CategoryEditorEntry extends CategoryMetadata { key: string; id?: string; label: string; value: string }
const control = 'min-h-11 rounded-ctl border border-line bg-white px-3 py-2 text-sm font-semibold text-ink hover:border-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal disabled:opacity-40'
export function CategoryEditor<T extends CategoryEditorEntry>({ value, onChange, reservedEntries = [] }: { value: T[]; onChange: (rows: T[]) => void; reservedEntries?: readonly CategoryMetadata[] }) {
  const [newName, setNewName] = useState('')
  const [error, setError] = useState('')
  const groups = groupCategoryEntries(value)
  const capacity = categoryEditorCapacity(value, reservedEntries)
  const updateCategory = (id: string, patch: CategoryMetadata) => onChange(value.map(row => row.category_id === id ? { ...row, ...patch } : row))
  const moveCategory = (index: number, delta: number) => {
    const order = groups.map(g => g.id); const next = index + delta
    if (next < 0 || next >= order.length) return
    ;[order[index],order[next]] = [order[next],order[index]]
    onChange(value.map(row => ({ ...row, category_order: order.indexOf(row.category_id || '__legacy') })))
  }
  const addCategory = () => {
    const name = newName.trim()
    if (!name) { setError('Enter a category name.'); return }
    if (groupCategoryEntries([...value, ...reservedEntries]).some(g => g.name.toLowerCase() === name.toLowerCase())) { setError('This category already exists. Add an item inside it.'); return }
    if (!capacity.canAddCategory) { setError('You have reached the category or item limit.'); return }
    const id = crypto.randomUUID()
    const row = { key: crypto.randomUUID(), category_id: id, category_name: name, category_order: capacity.nextOrder, category_position: 'end', show_on_resume: true, label: '', value: '', level: '' } as T
    onChange([...value,row]);setNewName('');setError('')
  }
  const updateItem = (key: string, patch: Partial<CategoryEditorEntry>) => onChange(value.map(row => row.key === key ? { ...row,...patch } : row))
  const removeItem = (key: string, categoryId: string) => {
    const others = value.filter(row => row.key !== key)
    if (!others.some(row => row.category_id === categoryId)) {
      onChange(value.map(row => row.key === key ? { ...row,label:'',value:'',level:'' } : row))
    } else onChange(others)
  }
  return <div className="space-y-4">
    <p className="field-hint">Suggested groups preserve your original details. Review them, move an item to another category or create your own. Category names do not add readiness points.</p>
    {groups.map((group, index) => <details key={group.id} open className="ui-mobile-flat rounded-card border border-line bg-canvas">
      <summary className="ui-nested-body min-h-12 cursor-pointer px-4 py-3 font-semibold text-ink">{group.name} <span className="font-normal text-ink-muted">· {group.items.filter(i => i.label || i.value).length} items</span></summary>
      <div className="ui-nested-body space-y-4 border-t border-line p-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1"><span className="field-label">Category name</span><input className="field" value={group.name} maxLength={80} onChange={e => updateCategory(group.id,{category_name:e.target.value})} /></label>
          <label className="space-y-1"><span className="field-label">Resume position</span><select className="field" value={group.position} onChange={e => updateCategory(group.id,{category_position:e.target.value as CategoryMetadata['category_position']})}>{CATEGORY_POSITIONS.map(position => <option key={position} value={position}>{CATEGORY_POSITION_LABELS[position]}</option>)}</select></label>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <label className="mr-auto flex min-h-11 items-center gap-2 text-sm text-ink"><input type="checkbox" checked={group.visible} onChange={e => updateCategory(group.id,{show_on_resume:e.target.checked})} />Show this category on my resume</label>
          <button type="button" className={control} disabled={index===0} aria-label={'Move '+group.name+' up'} onClick={() => moveCategory(index,-1)}><ArrowUp size={16} /></button>
          <button type="button" className={control} disabled={index===groups.length-1} aria-label={'Move '+group.name+' down'} onClick={() => moveCategory(index,1)}><ArrowDown size={16} /></button>
          <button type="button" className={control} aria-label={'Delete category '+group.name} onClick={() => { if (window.confirm('Delete this category and its items? This change takes effect when you save your profile.')) onChange(value.filter(row => row.category_id !== group.id)) }}><Trash2 size={16} /></button>
        </div>
        {group.items.map((item,itemIndex) => <div key={item.key} className="ui-mobile-flat space-y-3 rounded-ctl border border-line bg-white p-3 sm:p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="space-y-1"><span className="field-label">Item name</span><input className="field" placeholder="e.g. Honeywell Experion" maxLength={200} value={item.label} onChange={e => updateItem(item.key,{label:e.target.value})} /></label>
            <label className="space-y-1"><span className="field-label">Level / proficiency <span className="text-ink-muted">(optional)</span></span><input className="field" placeholder="e.g. Advanced, Fluent" maxLength={100} value={item.level || ''} onChange={e => updateItem(item.key,{level:e.target.value})} /></label>
          </div>
          <label className="block space-y-1"><span className="field-label">Details</span><textarea className="field" rows={3} maxLength={10000} value={item.value} placeholder="Describe your actual experience or qualification." onChange={e => updateItem(item.key,{value:e.target.value})} /></label>
          <div className="flex flex-wrap items-end gap-2">
            <label className="min-w-0 flex-1 space-y-1"><span className="field-label">Move to category</span><select className="field" value={group.id} disabled={!capacity.canAddItem && group.items.length === 1} title={!capacity.canAddItem && group.items.length === 1 ? 'Remove an unused item before moving the last item from this category.' : undefined} onChange={e => { const target=groups.find(g=>g.id===e.target.value); if (target && target.id !== group.id) { const remaining=value.filter(row=>row.key!==item.key); const moved={...item,category_id:target.id,category_name:target.name,category_order:target.order,category_position:target.position,show_on_resume:target.visible}; if (!remaining.some(row=>row.category_id===group.id)) remaining.push({...item,key:crypto.randomUUID(),id:undefined,label:'',value:'',level:''}); onChange([...remaining,moved]) } }}>{groups.map(g=><option key={g.id} value={g.id}>{g.name}</option>)}</select></label>
            <button type="button" className={control} disabled={itemIndex===0} aria-label="Move item up" onClick={() => { const next=[...value]; const a=next.findIndex(r=>r.key===item.key);const b=next.findIndex(r=>r.key===group.items[itemIndex-1].key);[next[a],next[b]]=[next[b],next[a]];onChange(next) }}><ArrowUp size={16} /></button>
            <button type="button" className={control} disabled={itemIndex===group.items.length-1} aria-label="Move item down" onClick={() => { const next=[...value];const a=next.findIndex(r=>r.key===item.key);const b=next.findIndex(r=>r.key===group.items[itemIndex+1].key);[next[a],next[b]]=[next[b],next[a]];onChange(next) }}><ArrowDown size={16} /></button>
            <button type="button" className={control} aria-label="Remove item" onClick={()=>removeItem(item.key,group.id)}><Trash2 size={16} /></button>
          </div>
        </div>)}
        <button type="button" className={control+' flex items-center gap-2'} disabled={!capacity.canAddItem} onClick={() => onChange([...value,{key:crypto.randomUUID(),category_id:group.id,category_name:group.name,category_order:group.order,category_position:group.position,show_on_resume:group.visible,label:'',value:'',level:''} as T])}><Plus size={16} />Add another item</button>
      </div>
    </details>)}
    <div className="space-y-3 rounded-card border border-dashed border-teal/40 bg-teal-soft/30 p-4">
      <label className="block space-y-1"><span className="field-label">New category name</span><input className="field" maxLength={80} placeholder="e.g. Projects, Languages, Professional Memberships" value={newName} onChange={e=>{setNewName(e.target.value);setError('')}} onKeyDown={e=>{if(e.key==='Enter'){e.preventDefault();addCategory()}}} /></label>
      {error ? <p role="alert" className="text-sm text-alert type-helper">{error}</p> : null}
      <button type="button" className={control+' flex items-center gap-2'} onClick={addCategory}><Plus size={16} />Add category</button>
    </div>
    <p className="field-hint">Use Save profile to keep these changes. Hidden categories stay in your profile. Don’t enter passport numbers, ID numbers or sensitive document details.</p>
  </div>
}
