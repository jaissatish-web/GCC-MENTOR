import { AppFooter } from '@/components/layout/AppFooter'
import { AuthLinkCatcher } from '@/components/auth/AuthLinkCatcher'
import { AtsFilter } from './AtsFilter'
import { BeforeAfterCv } from './BeforeAfterCv'
import { CoverLetters } from './CoverLetters'
import { OptimizationLevels } from './OptimizationLevels'
import { BranchJourney } from './BranchJourney'
import { DocumentOrbit, GccGlobe } from './lazy'
import { HeroStack } from './HeroStack'
import { MatchEngine } from './MatchEngine'
import { MockInterviewPreview } from './MockInterviewPreview'
import { PainSolution } from './PainSolution'
import { SectionHead, Wrap } from './primitives'
import { LandingNav, Faq, FinalCta, Founder, HeroCopy, JourneyOverview, MobileStickyCta, PricingPreview, ProofStrip, ServicesPreview, Trust, WhoItsFor } from './Sections'

/**
 * THE LANDING PAGE — v3 (founder-approved 2026-09-29, built as the
 * /landing-concept prototype and promoted to the home page).
 *
 * Everything lives in components/landing-v3/. The previous page (landing-v2)
 * is kept unrouted for rollback, like landing-legacy before it.
 * The nav's section links are checked against the ids here by
 * scripts/verify-landing-anchors.ts.
 *
 * Story: pain-first hero → the ATS filter → who it's for → the branching
 * journey → optimization level → the document ring → a letter per job →
 * match → before/after → mock interview → the founder → trust → the GCC
 * globe → pricing → FAQ → one ask.
 */
export function LandingPage() {
  return (
    <div className="w-full overflow-x-clip bg-canvas pb-[76px] font-redesign-sans text-ink antialiased lg:pb-0">
      <LandingNav />
      {/* Finishes emailed sign-in / reset links that Supabase sent to the home page. */}
      <div className="mx-auto max-w-[460px] px-4 empty:hidden">
        <AuthLinkCatcher />
      </div>
      <main>
        {/* 1 · Hero */}
        <section
          aria-label="Introduction"
          className="relative overflow-hidden bg-[radial-gradient(70%_55%_at_85%_20%,rgba(15,76,67,0.10),transparent_70%)] pb-10 pt-8 lg:pb-20 lg:pt-16"
        >
          <Wrap className="grid grid-cols-[minmax(0,1fr)] items-center gap-8 lg:grid-cols-[1.08fr_0.92fr] lg:gap-12">
            <HeroCopy />
            <HeroStack />
          </Wrap>
        </section>

        <ProofStrip />
        <ServicesPreview />

        {/* The hidden filter — why good candidates get no calls */}
        <section id="ats" aria-labelledby="ats-title" className="py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              id="ats-title"
              eyebrow="Why you’re not getting calls"
              title={<>Make your experience <em>easy to find.</em></>}
              lead="A clear CV helps recruiters and applicant tracking systems (ATS) find your relevant skills."
            />
            <AtsFilter />
          </Wrap>
        </section>

        {/* Who it's for — people and professions */}
        <WhoItsFor />

        {/* 2 · Pain → solution */}
        <section id="problems" aria-labelledby="problems-title" className="hidden md:block py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              id="problems-title"
              eyebrow="Sound familiar?"
              title={<>Good experience. <em>Wrong CV for the job.</em></>}
            />
            <PainSolution />
          </Wrap>
        </section>

        {/* 3 · Journey */}
        <section id="journey" aria-labelledby="journey-title" className="border-y border-line bg-white py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              id="journey-title"
              eyebrow="How it works"
              title={<>One profile. <em>Three simple steps.</em></>}
              lead="Build once. Prepare for each job. Keep everything in your Resume Library."
            />
            <JourneyOverview />
            <details className="group mt-6 rounded-card border border-line bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 type-label text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
                See a sample application
                <span aria-hidden="true" className="text-xl group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-line px-3 pb-5 sm:px-5"><BranchJourney /></div>
            </details>
          </Wrap>
        </section>

        {/* You choose how hard to optimize */}
        <section id="levels" aria-labelledby="levels-title" className="py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              id="levels-title"
              eyebrow="Optimization level"
              title={<>A light edit. <em>Or a fuller rewrite.</em></>}
              lead="Choose the level. Review and approve every change."
            />
            <OptimizationLevels />
          </Wrap>
        </section>

        {/* Resume showcase — curated designs from the real 50-template collection */}
        <section id="templates" aria-labelledby="templates-title" className="overflow-hidden pt-11 sm:pt-16 lg:pt-[104px]">
          <Wrap>
            <SectionHead
              center
              id="templates-title"
              eyebrow="50 resume templates"
              title={<>Your experience. <em>Your style.</em></>}
              lead="Choose from 50 resume templates. Tap a design to explore it."
            />
          </Wrap>
          <DocumentOrbit className="mt-4 lg:mt-8" />
        </section>

        {/* A different cover letter for every job */}
        <section id="letters" aria-labelledby="letters-title" className="border-t border-line bg-white py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              center
              id="letters-title"
              eyebrow="Cover letters"
              title={<>The right letter. <em>For each job.</em></>}
              lead="Written for the role, in your preferred tone."
            />
            <CoverLetters />
          </Wrap>
        </section>

        {/* 4 · One profile, prepared per job */}
        <section id="match" aria-labelledby="match-title" className="border-t border-line py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              center
              id="match-title"
              eyebrow="Prepared per job"
              title={<>Your experience. <em>Matched to the role.</em></>}
            />
            <MatchEngine />
          </Wrap>
        </section>

        {/* 5 · Before / after */}
        <section id="cv" aria-labelledby="cv-title" className="border-y border-line bg-white py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              center
              id="cv-title"
              eyebrow="Before / after"
              title={<>See the difference <em>in your CV.</em></>}
            />
            <BeforeAfterCv />
          </Wrap>
        </section>

        {/* 6 · Mock interview */}
        <section id="interview" aria-labelledby="interview-title" className="py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              id="interview-title"
              eyebrow="Mock interview"
              title={<>Practise the interview <em>before it counts.</em></>}
              lead="Practise your answers. Get feedback on what to improve."
            />
            <MockInterviewPreview />
          </Wrap>
        </section>

        {/* Founder */}
        <Founder />

        {/* 8 · Trust */}
        <Trust />

        {/* 9 · Markets — the globe */}
        <section id="markets" aria-labelledby="markets-title" className="py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <GccGlobe />
          </Wrap>
        </section>

        {/* 10 · Pricing, 11 · FAQ, 12 · Final CTA */}
        <PricingPreview />
        <Faq />
        <FinalCta />
      </main>
      <AppFooter />
      <MobileStickyCta />
    </div>
  )
}
