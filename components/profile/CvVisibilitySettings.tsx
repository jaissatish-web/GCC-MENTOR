'use client'

import {
  DocumentTextIcon,
  EyeIcon,
  EyeSlashIcon,
  IdentificationIcon,
  LockClosedIcon,
  PhoneIcon,
  UserCircleIcon,
} from '@heroicons/react/24/outline'
import { cn } from '@/lib/utils'
import { Toggle } from '@/components/ui/Toggle'
import type { FieldVisibility } from '@/types/careerProfile'

/**
 * PROFILE SETTINGS — what appears on the CV (founder brief 2026-10-04: "that
 * setting should be on the main profile page").
 *
 * It was its own route, /profile/visibility, which saved through its own PUT
 * and left the profile editor to get there — so anything typed and not yet
 * saved was lost on the way (docs/14_OPEN_ITEMS.md B5). It is now a screen of
 * the profile page itself: the toggles edit the same editor state, and the same
 * Save writes them with everything else (PUT /api/profile already carries
 * `field_visibility`). /profile/visibility redirects here.
 *
 * Hiding a field never deletes it. A CV records the visibility it was made
 * with (`field_visibility_snapshot`), so CVs already made do not change.
 *
 * The 15 keys are exactly FieldVisibility — every key present, no invented
 * ones (there is deliberately no professional_summary key).
 */

type Group = 'personal' | 'passport' | 'contact' | 'extra'

export const VISIBILITY_FIELDS: ReadonlyArray<{ key: keyof FieldVisibility; label: string; hint: string; group: Group }> = [
  { key: 'photo', label: 'Photo', hint: 'Expected on most Gulf CVs — passport-style.', group: 'personal' },
  { key: 'full_name', label: 'Full name', hint: 'Always expected on a CV.', group: 'personal' },
  { key: 'nationality', label: 'Nationality', hint: 'Standard on Gulf CVs.', group: 'personal' },
  { key: 'date_of_birth', label: 'Date of birth', hint: 'Some employers ask for it; safe to hide if unsure.', group: 'personal' },
  { key: 'passport_type', label: 'Passport type (ECR / Non-ECR)', hint: 'Affects Gulf hiring for Indian nationals.', group: 'passport' },
  { key: 'passport_validity', label: 'Passport validity date', hint: 'Visa processing needs a valid passport.', group: 'passport' },
  { key: 'visa_status', label: 'Visa status', hint: 'Shows your current right-to-work status.', group: 'passport' },
  { key: 'visa_transferable', label: 'Visa transferability', hint: 'A transferable visa appeals to many Gulf employers.', group: 'passport' },
  { key: 'notice_period', label: 'Notice period', hint: 'Employers plan around your notice period.', group: 'passport' },
  { key: 'current_location', label: 'Current location', hint: 'Helps employers gauge relocation.', group: 'contact' },
  { key: 'phone', label: 'Phone', hint: 'Contact for interview calls.', group: 'contact' },
  { key: 'whatsapp', label: 'WhatsApp', hint: 'The preferred contact channel across the Gulf.', group: 'contact' },
  { key: 'email', label: 'Email', hint: 'Contact for interview calls and offers.', group: 'contact' },
  { key: 'linkedin_url', label: 'LinkedIn URL', hint: 'Employers often check your profile.', group: 'contact' },
  { key: 'additional_information', label: 'Additional information', hint: 'The whole block — languages, awards, the rest.', group: 'extra' },
]

const GROUPS: ReadonlyArray<{ id: Group; title: string; icon: React.ComponentType<{ className?: string }>; badge: string }> = [
  { id: 'personal', title: 'Photo & personal', icon: UserCircleIcon, badge: 'bg-sec-identity/10 text-sec-identity' },
  { id: 'passport', title: 'Passport, visa & notice', icon: IdentificationIcon, badge: 'bg-sec-status/10 text-sec-status' },
  { id: 'contact', title: 'Contact', icon: PhoneIcon, badge: 'bg-sec-education/10 text-sec-education' },
  { id: 'extra', title: 'Extra details', icon: DocumentTextIcon, badge: 'bg-sec-additional/10 text-sec-additional' },
]

/** Visible-on-CV count and the labels of what is hidden — for the overview card. */
export function visibilitySummary(value: FieldVisibility): { shown: number; total: number; hidden: string[] } {
  const hidden = VISIBILITY_FIELDS.filter((f) => !value[f.key]).map((f) => f.label.replace(/ \(.*\)$/, ''))
  return { shown: VISIBILITY_FIELDS.length - hidden.length, total: VISIBILITY_FIELDS.length, hidden }
}

export function CvVisibilitySettings({
  value,
  filled,
  onChange,
}: {
  value: FieldVisibility
  /** Which details the profile actually holds — an empty one has nothing to show. */
  filled: Record<keyof FieldVisibility, boolean>
  onChange: (key: keyof FieldVisibility, shown: boolean) => void
}) {
  const { shown, total } = visibilitySummary(value)
  return (
    <div className="flex flex-col gap-4 px-5 py-4">
      <div className="flex flex-col gap-1.5 rounded-card border border-teal/20 bg-teal-soft/60 p-4">
        <p className="text-[14px] font-bold text-ink">
          {shown} of {total} details are shown on your CV
        </p>
        <p className="text-[13px] leading-relaxed text-ink-soft">
          Turn a detail off to leave it out of the CVs you make from now on. Hiding never deletes it, and CVs you
          already made keep the settings they were made with.
        </p>
      </div>

      {GROUPS.map((g) => {
        const Icon = g.icon
        const rows = VISIBILITY_FIELDS.filter((f) => f.group === g.id)
        return (
          <section key={g.id} aria-labelledby={`vis-${g.id}`} className="rounded-card border border-line bg-white shadow-m-1">
            <h2 id={`vis-${g.id}`} className="flex items-center gap-2.5 border-b border-line px-4 py-3 text-[14.5px] font-bold text-ink">
              <span className={cn('flex size-8 items-center justify-center rounded-full', g.badge)}>
                <Icon className="size-4" aria-hidden="true" />
              </span>
              {g.title}
            </h2>
            <ul className="divide-y divide-line">
              {rows.map(({ key, label, hint }) => {
                const on = value[key]
                return (
                  <li key={key} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13.5px] font-semibold text-ink">{label}</span>
                      <span className="text-[12px] leading-snug text-ink-muted">{hint}</span>
                      <span
                        className={cn(
                          'mt-0.5 inline-flex items-center gap-1 text-[12px] font-semibold',
                          !filled[key] ? 'text-ink-muted' : on ? 'text-ok' : 'text-ink-soft',
                        )}
                      >
                        {!filled[key] ? null : on ? <EyeIcon className="size-3.5" aria-hidden="true" /> : <EyeSlashIcon className="size-3.5" aria-hidden="true" />}
                        {!filled[key] ? 'Not in your profile yet — nothing to show' : on ? 'On your CV' : 'Hidden from your CV'}
                      </span>
                    </div>
                    <Toggle checked={on} onCheckedChange={(v) => onChange(key, v)} aria-label={`Show ${label} on my CV`} />
                  </li>
                )
              })}
            </ul>
          </section>
        )
      })}

      <p className="flex items-start gap-2.5 rounded-ctl border border-line bg-white px-3.5 py-3 text-[12px] leading-snug text-ink-soft">
        <LockClosedIcon className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden="true" />
        <span>
          Passport and visa details are private to your account, and any access by our team is logged. We never ask for
          or keep your passport number.
        </span>
      </p>
    </div>
  )
}
