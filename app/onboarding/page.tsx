'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { Button } from '@/components/ui/Button'
import { ProgressBar } from '@/components/ui/ProgressBar'
import { cn } from '@/lib/utils'

/**
 * Onboarding path chooser — screen 02 (TASK-022), route /onboarding.
 *
 * Conversion of the "02 · Choose how to start" screen in
 * design-reference/MVP Screens.dc.html — not a redesign. Three option cards,
 * each a real <button> with a 44px+ touch target, plus the progress bar
 * (1/5), back arrow, privacy note and Continue button shown in the mockup.
 *
 * This screen only CHOOSES a path. It does not call the rate limiter and does
 * not run extraction — screen 03 (TASK-023) will run POST /api/parse/upload or
 * /api/parse/text and handle the results. Path 3 (scratch) routes straight
 * through to the Career Profile review screen (/profile, TASK-024).
 *
 * NOTE (flagged to CTO): screen 03 has no route defined in docs/ — extraction
 * is a transient state with no URL in USER_FLOW. Paths 1 & 2 therefore advance
 * to /profile provisionally, recording which path was chosen in local state so
 * TASK-023 can intercept and run extraction when it is built. No extraction
 * happens here.
 */

type OnboardingPath = 'upload' | 'paste' | 'scratch'

function OptionCard({
  icon,
  title,
  badge,
  description,
  selected,
  onClick,
}: {
  icon: React.ReactNode
  title: string
  badge?: string
  description: string
  selected: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={cn(
        'flex w-full min-h-11 items-start gap-3.5 rounded-2xl border bg-white px-4 py-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2',
        selected
          ? 'border-emerald shadow-[0_8px_22px_rgba(14,92,74,0.1)]'
          : 'border-line'
      )}
    >
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[11px] bg-fill-subtle text-ink-body">
        {icon}
      </span>
      <span className="flex flex-col gap-1">
        <span className="flex items-center gap-2">
          <span className="text-[15px] font-bold text-midnight">{title}</span>
          {badge ? (
            <span className="rounded-[5px] bg-state-gold-bg px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-state-gold-text">
              {badge}
            </span>
          ) : null}
        </span>
        <span className="text-[12px] leading-snug text-ink-muted">{description}</span>
      </span>
    </button>
  )
}

export default function OnboardingPage() {
  const router = useRouter()
  const [path, setPath] = useState<OnboardingPath | null>(null)

  const continueLink = () => {
      // Upload & paste go to the transient extraction screen (TASK-023), which
      // collects the payload and runs POST /api/parse/upload or /api/parse/text.
      // "Start from scratch" skips extraction and goes straight to the Career
      // Profile review screen (/profile, TASK-024).
      if (path === 'upload') {
        router.push('/onboarding/extracting?path=upload')
      } else if (path === 'paste') {
        router.push('/onboarding/extracting?path=paste')
      } else {
        router.push('/profile')
      }
    }

  return (
    <main className="flex min-h-dvh flex-col bg-marble">
      {/* Status bar placeholder + header */}
      <header className="flex h-11 items-center justify-between px-5 text-[12px] font-semibold text-midnight">
        <span>9:41</span>
        <span className="tracking-[0.14em]">▮▮▮</span>
      </header>

      {/* Back arrow + progress bar 1/5 */}
      <div className="flex items-center gap-3.5 px-5 pb-4 pt-1.5">
        <button
          type="button"
          aria-label="Go back"
          onClick={() => router.back()}
          className="flex size-11 items-center justify-center rounded-lg text-[20px] leading-none text-midnight focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-midnight focus-visible:ring-offset-2"
        >
          ←
        </button>
        <div className="flex-1">
          <ProgressBar value={20} />
        </div>
        <span className="font-mono text-[11px] text-ink-muted">1/5</span>
      </div>

      {/* Heading */}
      <div className="flex flex-col gap-2 px-5">
        <h1 className="text-[30px] font-normal leading-[1.12] text-midnight [text-wrap:pretty]">
          Let&apos;s build your Career Profile
        </h1>
        <p className="mb-1.5 text-[14px] leading-normal text-ink-body [text-wrap:pretty]">
          Built once, reused for every future application. Choose whichever is easiest — all three
          end up in the same place.
        </p>
      </div>

      {/* Option cards */}
      <div className="flex flex-col gap-3 px-5 pt-3">
        <OptionCard
          icon={<span className="text-[17px] text-emerald">↑</span>}
          title="Upload a file"
          badge="Fastest"
          description="Resume PDF/DOCX, or your LinkedIn profile export. We read it and fill in everything we can."
          selected={path === 'upload'}
          onClick={() => setPath('upload')}
        />
        <OptionCard
          icon={<span className="text-[16px] text-ink-body">¶</span>}
          title="Paste your resume text"
          description="No file handy? Paste the text straight in."
          selected={path === 'paste'}
          onClick={() => setPath('paste')}
        />
        <OptionCard
          icon={<span className="text-[16px] text-ink-body">✎</span>}
          title="Start from scratch"
          description="Fill it in yourself. Good if you don't have a resume yet."
          selected={path === 'scratch'}
          onClick={() => setPath('scratch')}
        />
      </div>

      {/* Privacy note + Continue — pinned to the bottom like the mockup */}
      <div className="mt-auto flex flex-col gap-3 px-5 pb-6 pt-4">
        <div className="flex items-start gap-2.5 rounded-xl border border-line bg-fill-subtle px-3.5 py-3">
          <span className="text-[13px] text-emerald">⌾</span>
          <p className="text-[11px] leading-snug text-ink-body">
            Your file is used only to build your profile. Passport, visa and contact fields are
            encrypted and never shown publicly.
          </p>
        </div>
        <Button
          variant="primary"
          className="w-full"
          onClick={continueLink}
          disabled={path === null}
        >
          Continue
        </Button>
      </div>
    </main>
  )
}
