import type { ProfileAdditionalInformation } from '@/types/careerProfile'

export const CATEGORY_POSITIONS = ['after_summary', 'after_experience', 'after_education', 'after_skills', 'after_certifications', 'end'] as const
export type CategoryPosition = typeof CATEGORY_POSITIONS[number]
export const CATEGORY_POSITION_LABELS: Record<CategoryPosition, string> = {
  after_summary: 'After professional summary', after_experience: 'After work experience',
  after_education: 'After education', after_skills: 'After skills',
  after_certifications: 'After certifications', end: 'At the end',
}
export interface CategoryMetadata {
  category_id?: string | null
  category_name?: string | null
  category_order?: number | null
  category_position?: CategoryPosition | null
  level?: string | null
  show_on_resume?: boolean | null
}

/** Classification uses headings only, never guesses facts or proficiency. */
export function suggestedCategory(label: string): string {
  const name = label.trim()
  if (/language|linguistic/i.test(name)) return 'Languages'
  if (/project/i.test(name)) return 'Projects'
  if (/member|affiliation|association/i.test(name)) return 'Professional Memberships'
  if (/award|honou?r|achievement/i.test(name)) return 'Awards & Achievements'
  if (/software|system|tool|computer/i.test(name)) return 'Software & Systems'
  if (/availab|notice|relocat|salary/i.test(name)) return 'Availability & Preferences'
  if (/driv|licen[cs]e/i.test(name)) return 'Driving License'
  if (/hobb|interest/i.test(name)) return 'Interests'
  if (/marital|gender|personal/i.test(name)) return 'Personal Details'
  return name && name.length <= 80 ? name : 'Other Information'
}

export function organizeCategoryEntries<T extends { label?: string; value?: string } & CategoryMetadata>(rows: T[], id: () => string): Array<T & CategoryMetadata> {
  const categories = new Map<string, { id: string; order: number; position: CategoryPosition; visible: boolean }>()
  // Existing category identity and order win when a re-upload adds an entry.
  for (const row of rows) if (row.category_id && row.category_name) {
    categories.set(row.category_name.trim().toLowerCase(), { id: row.category_id, order: row.category_order ?? categories.size, position: row.category_position ?? 'end', visible: row.show_on_resume !== false })
  }
  let nextOrder = Math.max(-1, ...Array.from(categories.values()).map(c => c.order)) + 1
  return rows.map(row => {
    const name = row.category_name?.trim() || suggestedCategory(row.label ?? '')
    const key = name.toLowerCase()
    let category = categories.get(key)
    if (!category) { category = { id: id(), order: nextOrder++, position: row.category_position ?? 'end', visible: row.show_on_resume !== false }; categories.set(key, category) }
    return { ...row, category_id: row.category_id || category.id, category_name: name,
      category_order: row.category_id ? (row.category_order ?? category.order) : category.order, category_position: category.position,
      level: row.level ?? '', show_on_resume: category.visible }
  })
}

export function categoryFact(row: Pick<ProfileAdditionalInformation, 'label' | 'value'> & CategoryMetadata): string {
  if (!row.label?.trim() && !row.value?.trim()) return ''
  return [row.category_name, row.label, row.level, row.value].filter(v => typeof v === 'string' && v.trim()).join(': ')
}

export interface CategoryGroup<T> { id: string; name: string; order: number; position: CategoryPosition; visible: boolean; items: T[] }
export function groupCategoryEntries<T extends CategoryMetadata>(rows: T[]): CategoryGroup<T>[] {
  const groups = new Map<string, CategoryGroup<T>>()
  for (const row of rows) {
    const key = row.category_id || row.category_name || '__legacy'
    let group = groups.get(key)
    if (!group) {
      group = { id: key, name: row.category_name ?? 'Additional Information', order: row.category_order ?? groups.size,
        position: row.category_position ?? 'end', visible: row.show_on_resume !== false, items: [] }
      groups.set(key, group)
    }
    group.items.push(row)
  }
  return Array.from(groups.values()).sort((a,b) => a.order - b.order)
}

function headingKey(value: string): string {
  return value.toLowerCase().replace(/achivement|achievment/g, 'achievement').replace(/[^a-z0-9]/g, '').replace(/s$/, '')
}

/** A category already supplies its heading; keep item names that add information. */
export function categoryItemDisplay(display: string, categoryName?: string | null): string {
  if (!categoryName?.trim()) return display // pre-category snapshots keep their labels
  const category = headingKey(categoryName)
  let value = display
  for (let i = 0; i < 3; i++) {
    const prefix = /^\s*([^:\n]+?)\s*(?::|\s[—–-]\s)\s*/.exec(value)
    if (!prefix) break
    const key = headingKey(prefix[1])
    const redundant = key === category || (category.includes('achievement') && /^(key)?achievement$/.test(key))
    if (!redundant) break
    const remaining = value.slice(prefix[0].length)
    if (!remaining.trim()) break // never erase a label-only item
    value = remaining
  }
  return value
}

/** Presentation only: also fixes existing snapshots without rewriting their content. */
export function resumeCategoryGroups<T extends { entry: CategoryMetadata; display: string }>(items: T[]) {
  return groupCategoryEntries(items.map(item => ({ ...item.entry, item }))).map(group => ({
    ...group,
    items: group.items.map(row => ({ ...row.item, display: categoryItemDisplay(row.item.display, row.item.entry.category_name) })),
  }))
}

export function validateCategoryEntries(rows: unknown): string | null {
  if (!Array.isArray(rows) || rows.length > 200) return 'additional_information'
  const groups = new Map<string, string>()
  const names = new Map<string, string>()
  for (const raw of rows) {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return 'additional_information'
    const r = raw as Record<string, unknown>
    for (const [field,limit] of [['category_name',80],['level',100]] as const) {
      if (r[field] != null && (typeof r[field] !== 'string' || (r[field] as string).length > limit)) return `additional_information.${field}`
    }
    if (r.category_id != null && (typeof r.category_id !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(r.category_id))) return 'additional_information.category_id'
    if (r.category_id && (typeof r.category_name !== 'string' || !r.category_name.trim())) return 'additional_information.category_name'
    if (r.category_order != null && (!Number.isInteger(r.category_order) || Number(r.category_order)<0 || Number(r.category_order)>200)) return 'additional_information.category_order'
    if (r.category_position != null && !CATEGORY_POSITIONS.includes(r.category_position as CategoryPosition)) return 'additional_information.category_position'
    if (r.show_on_resume != null && typeof r.show_on_resume !== 'boolean') return 'additional_information.show_on_resume'
    if (r.category_id) {
      const name = String(r.category_name).trim().toLowerCase()
      const priorId = names.get(name)
      if (priorId && priorId !== r.category_id) return 'additional_information.duplicate_category'
      names.set(name, String(r.category_id))
      const signature = JSON.stringify([r.category_name,r.category_order,r.category_position,r.show_on_resume])
      const previous = groups.get(String(r.category_id))
      if (previous && previous !== signature) return 'additional_information.category_metadata'
      groups.set(String(r.category_id),signature)
    }
  }
  return groups.size > 30 ? 'additional_information.category_limit' : null
}
