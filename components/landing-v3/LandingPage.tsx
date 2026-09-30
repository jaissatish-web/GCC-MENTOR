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
import { LandingNav, Faq, FinalCta, Founder, HeroCopy, MobileStickyCta, PricingPreview, ProofStrip, Trust, WhoItsFor } from './Sections'

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

        {/* The hidden filter — why good candidates get no calls */}
        <section id="ats" aria-labelledby="ats-title" className="py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              id="ats-title"
              eyebrow="Why you’re not getting calls"
              title={<>It’s not your experience. <em>It’s the ATS.</em></>}
              lead="Most Gulf employers and recruitment agencies run every CV and cover letter through ATS software first. If it can’t find the job’s words, no recruiter ever sees you."
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
              eyebrow="How it works · 7 steps"
              title={<>One profile. <em>Every job you target.</em></>}
              lead="Build your profile once. Then each target job gets its own CV, cover letter, interview questions and mock interview."
            />
            <BranchJourney />
          </Wrap>
        </section>

        {/* You choose how hard to optimize */}
        <section id="levels" aria-labelledby="levels-title" className="py-11 sm:py-16 lg:py-[104px]">
          <Wrap>
            <SectionHead
              id="levels-title"
              eyebrow="Optimization level"
              title={<>You choose <em>how hard to push.</em></>}
              lead="Pick the intensity for each job. Optimize, review every line, then prepare for the interview before you face the client."
            />
            <OptimizationLevels />
          </Wrap>
        </section>

        {/* Document showcase — the 10 real templates + letter, Q&A, scorecard */}
        <section id="templates" aria-labelledby="templates-title" className="overflow-hidden pt-11 sm:pt-16 lg:pt-[104px]">
          <Wrap>
            <SectionHead
              center
              id="templates-title"
              eyebrow="Your application pack"
              title={<>Real GCC templates. <em>Every document you need.</em></>}
              lead="10 resume templates, plus a cover letter, interview questions and a mock-interview scorecard for each job. Tap any document."
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
              title={<>A different cover letter <em>for every job.</em></>}
              lead="Same you. A new letter each time — written to that company, that role and its keywords, in the tone you choose."
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
              title={<>Your information stays the same. <em>Each application is prepared around the job.</em></>}
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
              title={<>See what your CV is missing <em>before the recruiter does.</em></>}
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
              lead="Questions from your CV and the job. Answer out loud. See your score and what to fix."
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
