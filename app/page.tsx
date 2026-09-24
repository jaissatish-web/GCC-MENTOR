import { AppFooter } from '@/components/layout/AppFooter'
import { SiteNav } from '@/components/marketing/SiteNav'
import { Hero, TrustStrip } from '@/components/landing-v2/Hero'
import { Pain, PainFix, WhoItsFor } from '@/components/landing-v2/Problem'
import { HowItWorks } from '@/components/landing-v2/HowItWorks'
import { Markets, Services } from '@/components/landing-v2/Services'
import { BeforeAfter } from '@/components/landing-v2/BeforeAfter'
import { FounderBand, InterviewPrep, Trust } from '@/components/landing-v2/Trust'
import { TemplateOrbit } from '@/components/landing-v2/TemplateOrbit'
import { Faq, FinalCta, MobileStickyCta, Pricing } from '@/components/landing-v2/Closing'
import { AVAILABLE_TEMPLATE_COUNT } from '@/components/landing-v2/data'
import { Eyebrow, H2, Lead, Wrap } from '@/components/landing-v2/ui'

/**
 * THE LANDING PAGE — v2, from design/landing-v2 (founder-approved 2026-09-24).
 * The previous page is kept unrouted in components/landing-legacy/ until this
 * one is signed off.
 *
 * Section order is the design's (README §4). The nav and footer are the shared
 * site ones: the nav's section links are tested against the ids below by
 * scripts/verify-landing-anchors.ts, and the footer carries the admin-managed
 * legal links the design's footer did not have.
 *
 * Section ids used by the nav: journey · services · trust · templates · pricing · faq
 */
export default function Home() {
  return (
    <div className="w-full overflow-x-clip bg-canvas pb-[76px] font-sans text-ink antialiased lg:pb-0">
      <SiteNav />
      <main>
        <Hero />
        <TrustStrip />
        <WhoItsFor />
        <Pain />
        <PainFix />
        <HowItWorks />
        <Services />
        <BeforeAfter />
        <Trust />
        <Markets />
        <section id="templates" className="pb-6 pt-11 lg:border-y lg:border-line lg:bg-white lg:py-[104px]">
          <Wrap className="text-center">
            <Eyebrow>10 of {AVAILABLE_TEMPLATE_COUNT} GCC templates</Eyebrow>
            <H2>
              Find a style that fits <em>your next role.</em>
            </H2>
            <Lead className="mx-auto text-[14.5px] lg:text-[18px]">
              <span className="lg:hidden">Real templates with a fictional example CV. Tap any resume to pause and preview it.</span>
              <span className="hidden lg:inline">Real templates rendering a fictional example CV. Tap one to pause the rotation and read it full size.</span>
            </Lead>
          </Wrap>
          <TemplateOrbit className="mt-3 lg:mt-9" />
        </section>
        <InterviewPrep />
        <FounderBand />
        <Pricing />
        <Faq />
        <FinalCta />
      </main>
      <AppFooter />
      <MobileStickyCta />
    </div>
  )
}
