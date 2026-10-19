import { CheckCircleIcon, ArrowTopRightOnSquareIcon, ChevronDownIcon } from '@heroicons/react/24/outline'
import { PROFILE_PAGE_CONTENT } from '@/lib/professionalProfiles/pageContent'
import { PROFESSIONAL_PLATFORMS, type ProfessionalPlatform } from '@/lib/professionalProfiles/config'

export function ProfileVisibilityGuide({ platform }: { platform: ProfessionalPlatform }) {
  const copy = PROFILE_PAGE_CONTENT[platform]
  return (
    <section className="professional-guidance space-y-4" aria-label={`${PROFESSIONAL_PLATFORMS[platform].name} visibility guidance`}>
      <div>
        <p className="type-label font-semibold text-teal">KEEP BUILDING YOUR VISIBILITY</p>
        <h2 className="mt-2 type-section text-ink">Small actions. A stronger professional presence.</h2>
        <p className="mt-2 type-body text-ink-soft">Good content is your starting point. Keep your profile accurate, relevant and active as your career develops.</p>
      </div>
      <details className="professional-panel" open>
        <summary className="professional-summary type-card text-ink">Profile update guidance<ChevronDownIcon aria-hidden="true" className="professional-disclosure-icon size-5 shrink-0" /></summary>
        <div className="professional-guidance-list">
          {copy.tips.map(([title, detail]) => <div key={title} className="flex gap-3"><CheckCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-teal" /><div><h3 className="type-card text-ink">{title}</h3><p className="mt-1 type-body text-ink-soft">{detail}</p></div></div>)}
        </div>
      </details>
      <details className="professional-panel">
        <summary className="professional-summary type-card text-ink">Your routine for the weeks ahead<ChevronDownIcon aria-hidden="true" className="professional-disclosure-icon size-5 shrink-0" /></summary>
        <div className="professional-guidance-list">
          {copy.future.map(([title, detail]) => <div key={title}><h3 className="type-card text-ink">{title}</h3><p className="mt-1 type-body text-ink-soft">{detail}</p></div>)}
        </div>
      </details>
      <div className="flex flex-wrap gap-x-5 gap-y-1">
        {copy.sources.map(([label, url]) => <a key={url} href={url} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center gap-1.5 type-helper font-medium text-teal underline underline-offset-4">{label}<ArrowTopRightOnSquareIcon aria-hidden="true" className="size-4" /></a>)}
      </div>
    </section>
  )
}
