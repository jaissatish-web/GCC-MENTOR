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
  const card = 'rounded-card border border-line bg-white p-5 sm:p-7'
  return (
    <div
      className="mx-auto w-full max-w-[850px] space-y-4"
      data-testid="linkedin-preview"
      dir={draft.setup?.language === 'Arabic' ? 'rtl' : 'ltr'}
    >
      <p className="rounded-ctl bg-teal-soft px-4 py-3 text-sm text-ink">
        Illustrative preview of your content. LinkedIn’s actual layout may
        differ. This does not update your LinkedIn account.
      </p>
      <section className="overflow-hidden rounded-card border border-line bg-white">
        <div
          className="h-28 bg-gradient-to-r from-[#123941] via-[#1d6367] to-[#c4ddd7] sm:h-40"
          aria-hidden="true"
        />
        <div className="px-5 pb-6 sm:px-7">
          {profile.photo_url ? (
            <Image
              unoptimized
              width={112}
              height={112}
              src={profile.photo_url}
              alt="Your profile photo"
              className="relative -mt-12 mb-4 size-24 rounded-full border-4 border-white object-cover sm:size-28"
            />
          ) : (
            <div
              className="relative -mt-10 mb-4 flex size-24 items-center justify-center rounded-full border-4 border-white bg-teal-soft text-3xl font-semibold text-teal"
              aria-label="Profile photo placeholder"
            >
              {profile.full_name?.slice(0, 1)}
            </div>
          )}
          <h2 className="type-section text-ink">{text(profile.full_name)}</h2>
          <p className="mt-2 whitespace-pre-wrap break-words text-lg text-ink">
            {output.headlines[draft.selected_headline]}
          </p>
          <p className="mt-3 text-sm text-ink-muted">
            Your professional profile · Content preview
          </p>
        </div>
      </section>
      <section className={card}>
        <h2 className="type-section text-ink">About</h2>
        <p className="mt-4 whitespace-pre-wrap break-words leading-7 text-ink-soft">
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
                <article key={entry.id} className="py-5 first:pt-4 last:pb-0">
                  <h3 className="font-semibold text-ink">{text(role?.role)}</h3>
                  <p className="mt-1 text-ink-soft">{text(role?.company)}</p>
                  <p className="mt-1 text-sm text-ink-muted">
                    {role?.start_date?.slice(0, 7) ?? 'Date not provided'} –{' '}
                    {role?.end_date?.slice(0, 7) ?? 'Present'}
                  </p>
                  <p className="mt-3 whitespace-pre-wrap break-words leading-7 text-ink-soft">
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
              <h3 className="font-semibold text-ink">
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
              <h3 className="font-semibold text-ink">{text(entry.name)}</h3>
              <p className="text-ink-soft">{text(entry.issuer)}</p>
            </article>
          ))}
        </section>
      )}
      {output.skills.length > 0 && (
        <section className={card}>
          <h2 className="type-section text-ink">Skills</h2>
          <div className="mt-4 flex flex-wrap gap-2">
            {output.skills.map((skill) => (
              <span
                key={skill}
                className="rounded-full bg-canvas px-4 py-2 text-sm text-ink"
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
