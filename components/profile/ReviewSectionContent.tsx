export interface ReviewDisplayGroup {
  title?: string
  fields: Array<{ label: string; value: string }>
  kind?: 'tags'
}

/** Read-only existing facts with the same privacy redaction as source review. */
export function ReviewSectionContent({ content, groups }: { content: string; groups?: ReviewDisplayGroup[] }) {
  const safeContent = redactImportText(content)
  const visibleGroups = groups?.map(group => ({
    ...group,
    title: group.title ? redactImportText(group.title) : undefined,
    fields: group.fields.filter(field => field.value.trim()).map(field => {
      // Preserve the old flattened-text redaction context when a sensitive
      // label is now a separate row or card title. Only display copies change.
      const prefix = `${redactImportText(`${group.title ?? ''} ${field.label}`.replace(/\n/g, ' '))}: `
      return { label: redactImportText(field.label), value: redactImportText(prefix + field.value).slice(prefix.length) }
    }),
  })).filter(group => group.fields.length)
  const Group = visibleGroups && visibleGroups.length > 1 ? 'details' : 'section'
  const factualText = (value: string, label: string) => value.length > 420 ? (
    <details className="min-w-0">
      <summary className="cursor-pointer list-none rounded-ctl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal">
        <span className="block whitespace-pre-wrap break-words type-helper text-ink">{value.slice(0, 240)}…</span>
        <span className="mt-1 inline-flex min-h-11 items-center type-helper font-semibold text-teal">Read full {label.toLowerCase()}</span>
      </summary>
      <p className="mt-2 whitespace-pre-wrap break-words type-helper leading-relaxed text-ink">{value}</p>
    </details>
  ) : <p className="whitespace-pre-wrap break-words type-helper leading-relaxed text-ink">{value}</p>

  if (!visibleGroups?.length) return groups === undefined && safeContent.trim()
    ? <div data-review-structured-content className="min-w-0">{factualText(safeContent, 'text')}</div>
    : <p className="type-helper text-ink-muted">Not recorded</p>

  return <div data-review-structured-content className="grid min-w-0 gap-3">
    {visibleGroups.map((group, index) => <Group key={index} data-review-display-group open={Group === 'details' && index === 0 ? true : undefined} className="min-w-0 rounded-ctl border border-line bg-white p-3">
      {Group === 'details' ? <summary className="min-h-11 cursor-pointer break-words type-label font-semibold text-ink">{group.title ?? `Entry ${index + 1}`}</summary> : null}
      {group.kind === 'tags' ? <ul aria-label={group.title ?? 'Recorded skills'} className="flex min-w-0 flex-wrap gap-2">
        {group.fields.map((field, fieldIndex) => <li key={fieldIndex} className="max-w-full break-words rounded-ctl border border-line bg-canvas px-2 py-1 type-helper text-ink">{field.value}</li>)}
      </ul> : <dl className="grid min-w-0 gap-3">
        {group.fields.map((field, fieldIndex) => <div key={fieldIndex} className="grid min-w-0 gap-1 sm:grid-cols-[minmax(96px,0.32fr)_minmax(0,1fr)] sm:gap-3">
          <dt className="break-words type-caption text-ink-muted">{field.label}</dt>
          <dd className="min-w-0">{factualText(field.value, field.label)}</dd>
        </div>)}
      </dl>}
    </Group>)}
  </div>
}
import { redactImportText } from '@/lib/resumeParse/importReview'

