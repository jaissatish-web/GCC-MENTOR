import Image from 'next/image'
import Link from 'next/link'
import { ArrowRightIcon, CheckCircleIcon, SparklesIcon, UserCircleIcon, BriefcaseIcon, IdentificationIcon } from '@heroicons/react/24/outline'
import { PageShell } from '@/components/layout/PageShell'
import { ProfileVisibilityGuide } from './ProfileVisibilityGuide'
import { PROFILE_PAGE_CONTENT } from '@/lib/professionalProfiles/pageContent'
import { PROFESSIONAL_PLATFORMS, type ProfessionalPlatform } from '@/lib/professionalProfiles/config'

export function ProfileIntroduction({ platform }: { platform: ProfessionalPlatform }) {
  const config = PROFESSIONAL_PLATFORMS[platform]
  const copy = PROFILE_PAGE_CONTENT[platform]
  const other = PROFESSIONAL_PLATFORMS[platform === 'linkedin' ? 'naukrigulf' : 'linkedin']
  const icons = [IdentificationIcon, UserCircleIcon, BriefcaseIcon, SparklesIcon]
  return (
    <PageShell icon={platform === 'linkedin' ? IdentificationIcon : BriefcaseIcon} eyebrow="Your next Gulf career move" title={`${config.name} Optimization`} width="wide" className="professional-introduction" uses={['Career Profile', 'career goals']}>
      <section className={`professional-hero professional-hero-${platform}`} aria-labelledby="professional-promise">
        <div className="professional-hero-copy">
          <span className="professional-kicker type-label">YOUR EXPERIENCE. CLEARLY PRESENTED.</span>
          <h2 id="professional-promise" className="mt-3 type-title text-ink">{copy.headline}</h2>
          <p className="mt-4 type-lead text-ink-soft">{copy.description}</p>
          <div className="mt-5 flex flex-wrap gap-x-4 gap-y-2 type-helper font-medium text-teal">
            {['Built from your facts', 'Editable before you copy'].map(label => <span key={label} className="inline-flex items-center gap-1.5"><CheckCircleIcon aria-hidden="true" className="size-5" />{label}</span>)}
          </div>
          <a href="#profile-outputs" className="mt-5 inline-flex min-h-11 items-center gap-2 type-button font-semibold text-teal">Explore your preparation pack<ArrowRightIcon aria-hidden="true" className="size-4" /></a>
        </div>
        <figure className="professional-hero-figure">
          <Image src={copy.image} alt={copy.imageAlt} width={1200} height={800} priority sizes="(max-width: 639px) 100vw, (max-width: 1023px) 45vw, 500px" className="professional-hero-image" />
          <figcaption className="professional-image-caption type-helper">{platform === 'linkedin' ? 'A clearer story. A more confident introduction.' : 'Your experience. Ready for Gulf opportunities.'}</figcaption>
        </figure>
      </section>

      <section aria-labelledby="profile-importance" className="professional-section">
        <p className="type-label font-semibold text-teal">WHY THIS MATTERS</p>
        <h2 id="profile-importance" className="mt-2 type-section text-ink">Make it easier to understand your fit.</h2>
        <p className="mt-3 max-w-[75ch] type-body text-ink-soft">{copy.reason}</p>
        <div className="mt-5 grid gap-3 md:grid-cols-3">
          {copy.outcomes.map(([title, description], i) => { const Icon = icons[i]; return <article key={title} className="professional-panel"><Icon aria-hidden="true" className="mb-3 size-6 text-teal" /><h3 className="type-card text-ink">{title}</h3><p className="mt-2 type-description text-ink-soft">{description}</p></article> })}
        </div>
      </section>

      <section id="profile-outputs" aria-labelledby="profile-output-heading" className="professional-section scroll-mt-20">
        <p className="type-label font-semibold text-teal">YOUR PERSONALIZED PREPARATION PACK</p>
        <h2 id="profile-output-heading" className="mt-2 type-section text-ink">What you get — and where it goes</h2>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          {copy.outputs.map(([title, description, destination], i) => { const Icon = icons[i]; return <article key={title} className="professional-output-card professional-panel"><span className="professional-output-icon"><Icon aria-hidden="true" className="size-6" /></span><div><h3 className="type-card text-ink">{title}</h3><p className="mt-1 type-description text-ink-soft">{description}</p><p className="mt-3 type-helper font-medium text-teal">Paste into: {destination}</p></div></article> })}
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-2" aria-label="How we prepare your profile together">
        <div className="professional-panel professional-responsibility">
          <p className="type-label font-semibold text-teal">WE PREPARE</p><h2 className="mt-2 type-section text-ink">Your facts, shaped into clear writing.</h2>
          <ul className="mt-4 space-y-3 type-body text-ink-soft">{['Use your saved Career Profile and chosen direction.', 'Prepare the headline, summary and selected job descriptions.', 'Provide relevant skills, a preview and an update checklist.'].map(text => <li key={text} className="flex gap-2"><CheckCircleIcon aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-teal" />{text}</li>)}</ul>
        </div>
        <div className="professional-panel">
          <p className="type-label font-semibold text-teal">YOU STAY IN CONTROL</p><h2 className="mt-2 type-section text-ink">Review it. Make it yours. Publish confidently.</h2>
          <ol className="professional-numbered-list mt-4 type-body text-ink-soft">{['Confirm your experience and target roles.', 'Review or edit each section, then copy it.', `Paste into ${config.name}, save there and mark it updated here.`].map((text,i) => <li key={text}><span className="professional-step-number">{i+1}</span>{text}</li>)}</ol>
        </div>
      </section>

      <ProfileVisibilityGuide platform={platform} />

      <section className="professional-cta" aria-labelledby="profile-start">
        <div><p className="type-label font-semibold text-teal">YOUR NEXT STEP</p><h2 id="profile-start" className="mt-2 type-section text-ink">Prepare your {config.name} content.</h2><p className="mt-2 type-body text-ink-soft">Use Career Profile, or compare it with your existing profile. Continue your saved result whenever you need it.</p></div>
        <Link href={`${config.home}/workspace`} className="professional-primary">Optimize my {config.name}<ArrowRightIcon aria-hidden="true" className="size-5" /></Link>
        <p className="type-helper text-ink-muted">You publish the updates yourself. A clearer profile supports your job search; recruiter responses depend on the opportunity and your fit.</p>
      </section>
      <Link href={other.home} className="inline-flex min-h-11 items-center gap-2 type-button font-semibold text-teal">Prepare my {other.name} profile<ArrowRightIcon aria-hidden="true" className="size-4" /></Link>
    </PageShell>
  )
}
