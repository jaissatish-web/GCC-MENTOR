import { LandingExamples, ExampleDisclosure } from './LandingExamples'
import { HowItWorks } from '@/components/journey/HowItWorks'
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

        {/* 3 · Journey */}
        <section id="journey" aria-labelledby="journey-title" className="border-y border-line bg-white py-11 sm:py-16 lg:py-20">
          <Wrap>
            <SectionHead
              id="journey-title"
              eyebrow="How it works"
              title={<>One profile. <em>Three simple steps.</em></>}
              lead="Build your profile. Create a CV, or tailor it for your next Gulf role."
            />
            <JourneyOverview />
            <div className="mt-5 flex justify-center"><HowItWorks className="border border-teal/25 bg-teal-soft" /></div>
            <details className="group mt-6 rounded-card border border-line bg-white">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 py-4 type-label text-teal focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-teal [&::-webkit-details-marker]:hidden">
                See a sample application
                <span aria-hidden="true" className="text-xl group-open:rotate-45">+</span>
              </summary>
              <div className="border-t border-line px-3 pb-5 sm:px-5"><BranchJourney /></div>
            </details>
          </Wrap>
        </section>

        {/* Resume showcase — curated designs from the real 50-template collection */}
        <section id="templates" aria-labelledby="templates-title" className="overflow-hidden pt-11 sm:pt-16 lg:pt-20">
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

        {/* 5 · Before / after */}
        <section id="cv" aria-labelledby="cv-title" className="border-y border-line bg-white py-11 sm:py-16 lg:py-20">
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
        <section id="interview" aria-labelledby="interview-title" className="py-11 sm:py-16 lg:py-20">
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

        <section aria-labelledby="examples-title" className="border-y border-line bg-white py-10 sm:py-14">
          <Wrap>
            <SectionHead id="examples-title" eyebrow="Explore the details" title={<>See how your <em>Gulf application comes together.</em></>} />
            <LandingExamples>
              <ExampleDisclosure id="letters" title="A cover letter for each target job"><CoverLetters /></ExampleDisclosure>
              <ExampleDisclosure id="match" title="How your experience matches a role"><MatchEngine /></ExampleDisclosure>
              <ExampleDisclosure id="levels" title="Choose how much to improve your CV"><OptimizationLevels /></ExampleDisclosure>
              <ExampleDisclosure id="ats" title="Make your experience easier to find"><AtsFilter /></ExampleDisclosure>
              <ExampleDisclosure id="problems" title="Common CV problems, explained visually"><PainSolution /></ExampleDisclosure>
              <ExampleDisclosure id="who" title="For professionals across the Gulf"><WhoItsFor /></ExampleDisclosure>
              <ExampleDisclosure id="trust" title="Your experience stays in your control"><Trust /></ExampleDisclosure>
            </LandingExamples>
          </Wrap>
        </section>

        {/* Founder */}
        <Founder />


        {/* 9 · Markets — the globe */}
        <section id="markets" aria-labelledby="markets-title" className="py-11 sm:py-16 lg:py-20">
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
