'use client'
import Image from 'next/image'
import type { CareerProfileFull } from '@/types/careerProfile'
import type { LinkedInDraft } from '@/lib/linkedin/types'
import { publicText } from '@/lib/linkedin/model'

/** Illustrative profile view, not an embedded or connected LinkedIn account. */
export function ProfilePreview({
  profile,
  draft,
}: {
  profile: CareerProfileFull
  draft: LinkedInDraft
}) {
  const output = draft.output!
  const text = (value: string | null | undefined) =>
    publicText(value, draft.setup?.omitTerms ?? []).replace(
      /\[private\]/g,
      'Not shared',
    )
  const card = 'linkedin-profile-card'
  return (
    <div
      className="linkedin-profile-preview mx-auto w-full max-w-[850px] space-y-2"
      data-testid="linkedin-preview"
      dir={draft.setup?.language === 'Arabic' ? 'rtl' : 'ltr'}
    >
      <p className="linkedin-preview-notice px-4 py-3 text-sm text-ink-muted">
        Illustrative preview of your content. LinkedIn’s actual layout may
        differ. This does not update your LinkedIn account.
      </p>
      <section className="linkedin-profile-card overflow-hidden !p-0">
        <div
          className="h-24 bg-gradient-to-r from-[#123941] via-[#1d6367] to-[#c4ddd7] sm:h-40"
          aria-hidden="true"
        />
        <div className="px-4 pb-4 sm:px-6 sm:pb-6">
          {profile.photo_url ? (
            <Image
              unoptimized
              width={112}
              height={112}
              src={profile.photo_url}
              alt="Your profile photo"
              className="relative -mt-10 mb-3 size-20 rounded-full border-4 border-white object-cover sm:size-28"
            />
          ) : (
            <div
              className="relative -mt-10 mb-3 flex size-20 items-center justify-center rounded-full border-4 border-white bg-teal-soft text-3xl font-semibold text-teal"
              aria-label="Profile photo placeholder"
            >
              {profile.full_name?.slice(0, 1)}
            </div>
          )}
          <h2 className="linkedin-profile-name text-ink">{text(profile.full_name)}</h2>
          <p className="linkedin-profile-headline mt-1 whitespace-pre-wrap break-words text-ink">
            {output.headlines[draft.selected_headline]}
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            {text(profile.current_location) || 'Your professional profile'}
          </p>
          <div className="mt-3 flex flex-wrap gap-2" aria-hidden="true">
            <span className="linkedin-profile-action linkedin-profile-action-primary">Open to</span>
            <span className="linkedin-profile-action">Add profile section</span>
          </div>
        </div>
      </section>
      <section className={card}>
        <h2 className="type-section text-ink">About</h2>
        <p className="mt-3 whitespace-pre-wrap break-words leading-normal text-ink-soft">
          {output.about}
        </p>
      </section>
      {output.experience.length > 0 && (
        <section className={card}>
          <h2 className="type-section text-ink">Experience</h2>
          <div className="divide-y divide-line">
            {output.experience.map((entry) => {
              const role = profile.work_experience.find(
                (item) => item.id === entry.id,
              )
              return (
                <article key={entry.id} className="py-4 first:pt-3 last:pb-0">
                  <h3 className="font-medium text-ink">{text(role?.role)}</h3>
                  <p className="mt-1 text-ink-soft">{text(role?.company)}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {role?.start_date?.slice(0, 7) ?? 'Date not provided'} –{' '}
                    {role?.end_date?.slice(0, 7) ?? 'Present'}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap break-words leading-normal text-ink-soft">
                    {entry.description}
                  </p>
                </article>
              )
            })}
          </div>
        </section>
      )}
      {profile.education.length > 0 && (
        <section className={card}>
          <h2 className="type-section text-ink">Education</h2>
          {profile.education.map((entry) => (
            <article key={entry.id} className="mt-4">
              <h3 className="font-medium text-ink">
                {text(entry.institution)}
              </h3>
              <p className="text-ink-soft">
                {[text(entry.degree), text(entry.field_of_study)]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            </article>
          ))}
        </section>
      )}
      {profile.certifications.length > 0 && (
        <section className={card}>
          <h2 className="type-section text-ink">Licences & certifications</h2>
          {profile.certifications.map((entry) => (
            <article key={entry.id} className="mt-4">
              <h3 className="font-medium text-ink">{text(entry.name)}</h3>
              <p className="text-ink-soft">{text(entry.issuer)}</p>
            </article>
          ))}
        </section>
      )}
      {output.skills.length > 0 && (
        <section className={card}>
          <h2 className="type-section text-ink">Skills</h2>
          <div className="mt-3 divide-y divide-line">
            {output.skills.map((skill) => (
              <span
                key={skill}
                className="block py-3 text-sm font-medium text-ink first:pt-0 last:pb-0"
              >
                {skill}
              </span>
            ))}
          </div>
        </section>
      )}
    </div>
  )
}
