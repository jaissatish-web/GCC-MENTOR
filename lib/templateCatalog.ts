import { availableTemplates, type TemplateEntry, type TemplateField, type TemplateId } from '@/lib/templates'

export type TemplatePurpose = 'recommended' | 'all' | 'ats' | 'photo' | 'senior' | 'entry'
const FEATURED: TemplateId[] = ['gulf_premium', 'gcc_professional', 'ats_professional', 'ats_classic', 'modern_professional', 'senior_professional', 'senior_compact', 'graduate_entry']
export function templateCatalog({ purpose = 'all', field = '', search = '' }: { purpose?: TemplatePurpose; field?: TemplateField | ''; search?: string } = {}): TemplateEntry[] {
  const words = search.trim().toLowerCase().split(/\s+/).filter(Boolean)
  return availableTemplates().filter(t => {
    if (field && !t.fields.includes(field)) return false
    if (purpose === 'recommended' && !FEATURED.includes(t.id)) return false
    if (purpose === 'ats' && (t.allowsPhoto || (t.theme && t.theme.layout !== 'single'))) return false
    if (purpose === 'photo' && !t.allowsPhoto) return false
    if (purpose === 'senior' && !['senior', 'executive'].includes(t.category)) return false
    if (purpose === 'entry' && t.category !== 'entry') return false
    const haystack = [t.name, t.description, ...t.recommendedFor, ...t.fields].join(' ').toLowerCase()
    return words.every(word => haystack.includes(word))
  }).sort((a, b) => {
    const rank = (id: TemplateId) => FEATURED.includes(id) ? FEATURED.indexOf(id) : FEATURED.length
    return rank(a.id) - rank(b.id) || a.name.localeCompare(b.name)
  })
}
