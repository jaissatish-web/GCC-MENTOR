/** Presentation order only: never reorder the editor or saved career history. */
export function sortedWorkRoles<T extends { start_date: string; end_date: string }>(roles: readonly T[]): T[] {
  return roles.map((role, index) => ({ role, index })).sort((a, b) => {
    const current = (r: T) => Boolean(r.start_date.trim() && !r.end_date.trim())
    return Number(current(b.role)) - Number(current(a.role)) || b.role.end_date.localeCompare(a.role.end_date) || b.role.start_date.localeCompare(a.role.start_date) || a.index - b.index
  }).map(item => item.role)
}
export function workDateLabel(value: string): string {
  const match = value.match(/^(\d{4})-(\d{2})(?:-\d{2})?$/)
  if (!match) return value || 'Date not added'
  const month = Number(match[2])
  if (month < 1 || month > 12) return value
  return `${['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'][month - 1]} ${match[1]}`
}
