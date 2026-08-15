'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'
import { AppShell } from '@/components/layout/AppShell'
import { PageHeader, PageContainer } from '@/components/layout/PageHeader'
import { Button } from '@/components/ui/Button'
import { cn } from '@/lib/utils'
import {
  ArrowUpTrayIcon,
  ClipboardDocumentIcon,
  PencilSquareIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline'

/**
 * Create Resume — the in-app entry point for starting a resume.
 *
 * DELIBERATELY NOT NEW LOGIC. `/onboarding` already offered exactly these
 * three paths, and every one of them is a real, working pipeline today:
 * upload and paste both hand off to `/onboarding/extracting`, which runs
 * POST /api/parse/upload or /api/parse/text; "type it in" goes straight to
 * the Career Profile editor. This page routes into those same destinations
 * with the same query params — no second extraction path, no duplicated
 * parsing, nothing to keep in sync.
 *
 * What it adds is placement: `/onboarding` sits outside the app shell (no
 * sidebar, its own 5-step progress chrome), which is fine for a first-run
 * flow but is a dead end for a returning user who just wants to start
 * another resume. This is the same choice inside the shell.
 */
type CreatePath = 'upload' | 'paste' | 'type'

interface PathOption {
  id: CreatePath
  title: string
  badge?: string
  description: string
  detail: string
  icon: React.ComponentType<{ className?: string }>
  href: string
}

const OPTIONS: readonly PathOption[] = [
  {
    id: 'upload',
    title: 'Upload a file',
    badge: 'Fastest',
    description: 'Bring an existing resume as a PDF or DOCX.',
    detail: 'We read it and fill in everything we can find, then let you correct anything before saving.',
    icon: ArrowUpTrayIcon,
    href: '/onboarding/extracting?path=upload',
  },
  {
    id: 'paste',
    title: 'Paste resume text',
    description: 'No file handy? Paste the text straight in.',
    detail: 'Useful when your resume lives in an email, a Google Doc, or a LinkedIn profile you can copy from.',
    icon: ClipboardDocumentIcon,
    href: '/onboarding/extracting?path=paste',
  },
  {
    id: 'type',
    title: 'Type it in yourself',
    description: 'Start from a blank Career Profile.',
    detail: 'Best if you do not have a resume yet, or you would rather enter your history section by section.',
    icon: PencilSquareIcon,
    href: '/profile',
  },
]

export default function CreateResumePage() {
  const router = useRouter()
  const [selected, setSelected] = useState<CreatePath | null>(null)

  const chosen = OPTIONS.find((o) => o.id === selected) ?? null

  return (
    <AppShell>
      <PageContainer width="wide">
        <PageHeader
          title="Create Resume"
          description="Three ways to start — they all end up in the same Career Profile, so pick whichever is easiest right now."
        />

        <div className="mt-7 grid gap-4 md:grid-cols-3">
          {OPTIONS.map((option) => {
            const Icon = option.icon
            const active = selected === option.id
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => setSelected(option.id)}
                aria-pressed={active}
                className={cn(
                  'flex h-full flex-col gap-3 rounded-radius-lg border p-5 text-left transition-colors',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-redesign-gold focus-visible:ring-offset-2 focus-visible:ring-offset-bg',
                  active
                    ? 'border-redesign-gold bg-redesign-gold/[0.08] shadow-redesign-md'
                    : 'border-line-light bg-surface-light hover:border-redesign-gold/40 hover:bg-surface-2-light'
                )}
              >
                <span className="flex items-center justify-between gap-2">
                  <span
                    className={cn(
                      'flex size-10 items-center justify-center rounded-[11px]',
                      active ? 'bg-redesign-gold text-forest-deep' : 'bg-surface-2-light text-ink-900'
                    )}
                  >
                    <Icon className="size-5" />
                  </span>
                  {active ? (
                    <CheckCircleIcon className="size-5 shrink-0 text-redesign-gold" />
                  ) : option.badge ? (
                    <span className="rounded-[5px] bg-redesign-gold-tint px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider text-gold-text">
                      {option.badge}
                    </span>
                  ) : null}
                </span>
                <span className="text-[15px] font-bold text-ink-900">{option.title}</span>
                <span className="text-[12.5px] leading-relaxed text-ink-700">
                  {option.description}
                </span>
                <span className="mt-auto text-[11.5px] leading-relaxed text-ink-400">
                  {option.detail}
                </span>
              </button>
            )
          })}
        </div>

        {/* Continue — disabled until a path is chosen, so the next step is never ambiguous */}
        <div className="mt-7 flex flex-col gap-3 rounded-radius-lg border border-line-light bg-surface-light p-5 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-[12.5px] leading-relaxed text-ink-400">
            {chosen
              ? `Continue with “${chosen.title}”. You can change your mind at any point before saving.`
              : 'Choose one of the three options above to continue.'}
          </p>
          <Button
            type="button"
            variant="purchase"
            disabled={!chosen}
            onClick={() => chosen && router.push(chosen.href)}
            className="shrink-0 disabled:cursor-not-allowed disabled:opacity-50"
          >
            Continue
          </Button>
        </div>

        <p className="mt-4 text-[11.5px] leading-relaxed text-ink-400">
          Nothing is invented from thin air — every line of a generated resume traces back to a fact
          in your Career Profile.
        </p>
      </PageContainer>
    </AppShell>
  )
}
