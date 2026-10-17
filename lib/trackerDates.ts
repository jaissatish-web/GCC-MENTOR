/** Calendar deadlines keep the employer's day; instants display in the viewer's device zone. */
export function formatTrackerDate(value: string, includeTime = false): string {
  if (!value) return ''
  const calendarDay = /^\d{4}-\d{2}-\d{2}$/.test(value)
  const date = new Date(calendarDay ? `${value}T00:00:00Z` : value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
    ...(calendarDay ? { timeZone: 'UTC' } : includeTime ? { hour: '2-digit', minute: '2-digit', timeZoneName: 'short' } : {}),
  }).format(date)
}
