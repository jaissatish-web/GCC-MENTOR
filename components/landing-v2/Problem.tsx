import Image from 'next/image'
import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { AVAILABLE_TEMPLATE_COUNT } from './data'
import { Card, Eyebrow, H2, Lead, SWIPE_ROW, Wrap } from './ui'

const AUDIENCE = [
  ['Already working in the Gulf', 'Aiming for a better role, a bigger project or a higher package.', '/landing/who-already-in-gulf.jpg', 'An engineer in a hard hat and hi-vis vest on site'],
  ['Moving to the Gulf', 'From India or elsewhere — presented the way Gulf employers read it.', '/landing/who-moving-to-gulf.jpg', 'A modern airport terminal hall'],
  ['Returning to the Gulf', 'Bringing earlier GCC experience back to the front of your CV.', '/landing/who-returning.jpg', 'An airport departures board'],
  ['Any profession', 'Engineering, construction, IT, finance, healthcare, operations and more.', '/landing/who-any-profession.jpg', 'A nurse at work in a hospital'],
] as const

export function WhoItsFor() {
  return (
    <section className="pb-5 pt-11 lg:pb-10 lg:pt-[104px]">
      <Wrap>
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div>
            <Eyebrow>Who it is for</Eyebrow>
            <H2>
              For professionals serious <br className="hidden lg:block" />
              about a <em>Gulf career.</em>
            </H2>
          </div>
          <p className="mt-3 text-[16px] leading-[1.6] text-ink-soft lg:m-0 lg:max-w-[400px] lg:text-[16px] lg:leading-[1.65]">
            <span className="md:hidden">Swipe to find yourself.</span>
            <span className="hidden md:inline">
              Already in the Gulf or planning the move, the problem is the same: good experience, presented in a way that
              doesn&apos;t reach the right people.
            </span>
          </p>
        </div>
        <ul className={cn(SWIPE_ROW, 'mt-[18px] md:mx-0 md:grid md:grid-cols-2 md:gap-4 md:overflow-visible md:px-0 lg:mt-10 lg:grid-cols-4')}>
          {AUDIENCE.map(([title, body, img, alt]) => (
            <li key={title} className="w-[250px] shrink-0 snap-start md:w-auto">
              <Card className="h-full overflow-hidden">
                <div className="relative h-[150px] lg:h-[200px]">
                  <Image src={img} alt={alt} fill sizes="(min-width: 1024px) 280px, (min-width: 768px) 50vw, 250px" className="object-cover" />
                </div>
                <div className="px-4 py-3.5 lg:p-5">
                  <div className="font-extrabold lg:text-[17px]">{title}</div>
                  <div className="mt-1 text-[13px] leading-[1.5] text-ink-muted lg:mt-1.5 lg:text-[14px] lg:leading-[1.55]">{body}</div>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  )
}

const SKIM = [
  ['What they search', 'Their own words from the job advert'],
  ['What they skim', 'GCC projects, clients, visa, notice'],
  ['What they skip', '“Responsible for activities at site”'],
] as const

export function Pain() {
  return (
    <section id="pain" className="pb-5 pt-9 lg:pb-0 lg:pt-20">
      <Wrap className="grid lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)] lg:gap-x-16">
        <div className="lg:col-start-2 lg:row-start-1 lg:self-end">
          <Eyebrow>Sound familiar?</Eyebrow>
          <H2>
            Applied everywhere. <br className="hidden lg:block" />
            <em>Heard nothing back.</em>
          </H2>
        </div>

        <div className="relative mt-[18px] lg:col-start-1 lg:row-span-2 lg:row-start-1 lg:mt-0 lg:self-center">
          <div className="relative h-[220px] overflow-hidden rounded-[20px] md:h-[320px] lg:h-[420px] lg:rounded-[22px] lg:shadow-[0_24px_60px_rgba(20,24,28,0.14)]">
            <Image src="/landing/pain-applying-laptop.jpg" alt="A professional applying for jobs on a laptop" fill sizes="(min-width: 1024px) 540px, 100vw" className="object-cover" />
          </div>
          <Card className="relative mx-3 -mt-12 flex flex-col gap-1.5 p-3 text-[12.5px] text-ink-muted shadow-lp-float lg:absolute lg:-bottom-[34px] lg:-right-6 lg:m-0 lg:w-[320px] lg:gap-[7px] lg:p-4 lg:text-[13px]">
            <div className="flex justify-between text-[11px] lg:text-[12px]">
              <span className="font-mono">INBOX</span>
              <span>0 replies this week</span>
            </div>
            <div className="mt-1 rounded-[10px] bg-canvas px-3 py-2">no-reply@careers · Application received</div>
            <div className="hidden rounded-[10px] bg-canvas px-3 py-2 lg:block">no-reply@talent · We have your CV on file</div>
            <div className="rounded-[10px] bg-canvas px-3 py-2">no-reply@jobs · Position filled</div>
          </Card>
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <Lead>
            It usually isn&apos;t your experience. Many Gulf applications are screened by keyword search and a fast recruiter
            skim before anyone reads them properly — and a generic CV doesn&apos;t use the words that employer is searching
            for.
          </Lead>
          <div className="mt-7 hidden gap-3 md:grid md:grid-cols-3">
            {SKIM.map(([label, body]) => (
              <Card key={label} className="p-4">
                <div className="font-mono text-[11px] uppercase text-alert">{label}</div>
                <div className="mt-2 text-[14px] font-semibold leading-[1.5]">{body}</div>
              </Card>
            ))}
          </div>
        </div>
      </Wrap>
    </section>
  )
}

const ICON = 'size-[52px]'
const FIX_ICONS: ReactNode[] = [
  <svg key="0" className={ICON} viewBox="0 0 56 56" fill="none" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="14" width="26" height="34" rx="3" stroke="#D2C9BC" strokeWidth="2" fill="#FFFFFF" /><rect x="14" y="10" width="26" height="34" rx="3" stroke="#B9AE9E" strokeWidth="2" fill="#FFFFFF" /><rect x="22" y="6" width="26" height="34" rx="3" stroke="#0F4C43" strokeWidth="2" fill="#E4EEEB" /><path d="M28 16h14M28 22h14M28 28h9" stroke="#0F4C43" strokeWidth="2" /></svg>,
  <svg key="1" className={ICON} viewBox="0 0 56 56" fill="none" strokeLinecap="round" aria-hidden="true"><path d="M10 38a18 18 0 0 1 36 0" stroke="#EAE4DB" strokeWidth="5" /><path d="M10 38a18 18 0 0 1 24-17" stroke="#0F4C43" strokeWidth="5" /><path d="M28 38l9-12" stroke="#14181C" strokeWidth="2.5" /><circle cx="28" cy="38" r="3" fill="#14181C" /></svg>,
  <svg key="2" className={ICON} viewBox="0 0 56 56" fill="none" strokeLinejoin="round" aria-hidden="true"><path d="M8 8h16v6a4 4 0 1 0 8 0V8h16v16h-6a4 4 0 1 0 0 8h6v16H8z" stroke="#B9AE9E" strokeWidth="2" /><path d="M32 32h16v16H32z" stroke="#C9962E" strokeWidth="2" strokeDasharray="3 3" fill="#F7EFDD" /></svg>,
  <svg key="3" className={ICON} viewBox="0 0 56 56" fill="none" aria-hidden="true"><rect x="8" y="6" width="40" height="44" rx="4" stroke="#B9AE9E" strokeWidth="2" fill="#FFFFFF" /><rect x="9" y="7" width="13" height="42" fill="#E4EEEB" /><circle cx="15" cy="16" r="4" fill="#0F4C43" /><path d="M27 14h15M27 20h11M27 28h15M27 34h15M27 40h9" stroke="#616B76" strokeWidth="2" strokeLinecap="round" /></svg>,
  <svg key="4" className={ICON} viewBox="0 0 56 56" fill="none" strokeLinejoin="round" aria-hidden="true"><rect x="6" y="14" width="44" height="30" rx="4" stroke="#B9AE9E" strokeWidth="2" /><path d="M6 18l22 14 22-14" stroke="#0F4C43" strokeWidth="2" /></svg>,
  <svg key="5" className={ICON} viewBox="0 0 56 56" fill="none" strokeLinejoin="round" aria-hidden="true"><path d="M6 10h30v20H18l-8 7v-7H6z" stroke="#B9AE9E" strokeWidth="2" /><path d="M24 34v6h14l8 7v-7h4V20H40" stroke="#0F4C43" strokeWidth="2" /><path d="M13 18h16M13 23h10" stroke="#616B76" strokeWidth="2" strokeLinecap="round" /></svg>,
  <svg key="6" className={ICON} viewBox="0 0 56 56" fill="none" aria-hidden="true"><ellipse cx="28" cy="12" rx="16" ry="6" stroke="#0F4C43" strokeWidth="2" /><path d="M12 12v14c0 3.3 7.2 6 16 6s16-2.7 16-6V12" stroke="#B9AE9E" strokeWidth="2" /><path d="M12 26v14c0 3.3 7.2 6 16 6s16-2.7 16-6V26" stroke="#B9AE9E" strokeWidth="2" /></svg>,
  <svg key="7" className={ICON} viewBox="0 0 56 56" fill="none" aria-hidden="true"><circle cx="28" cy="28" r="20" stroke="#B9AE9E" strokeWidth="2" /><circle cx="28" cy="28" r="12" stroke="#B9AE9E" strokeWidth="2" /><circle cx="28" cy="28" r="4" fill="#0F4C43" /><path d="M40 16l8-8M44 8h4v4" stroke="#C9962E" strokeWidth="2" strokeLinecap="round" /></svg>,
]

const FIXES: ReadonlyArray<readonly [string, string]> = [
  ['One generic CV sent to every job', 'A CV rewritten for each target job, from the same profile'],
  ['No idea whether your CV matches the job', 'An ATS match score for that job, before and after'],
  ['Important keywords missing', 'Job keywords brought forward where your experience supports them'],
  ['A CV layout that doesn’t suit Gulf employers', `${AVAILABLE_TEMPLATE_COUNT} GCC resume templates, one click to switch`],
  ['Cover letters that repeat the CV or say nothing', 'A letter for the same job, in the tone you choose'],
  ['Walking into interviews unprepared', 'Likely questions, drafted answers and written practice'],
  ['Typing the same details into every form', 'One Career Profile that every service reads from'],
  ['Not sure how ready you are for the Gulf', 'A free Gulf Readiness score with what to fix first'],
]

export function PainFix() {
  return (
    <section className="pb-10 pt-6 lg:pb-[100px] lg:pt-[110px]">
      <Wrap>
        <div className="lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div>
            <Eyebrow>Here is what changes</Eyebrow>
            <H2 className="hidden lg:block lg:text-[40px]">
              Find your problem. <em>See the fix.</em>
            </H2>
          </div>
          <p className="hidden max-w-[360px] leading-[1.6] text-ink-soft lg:block">
            Each fix is a step in GCC Mentor — one workflow, not separate tools to stitch together.
          </p>
        </div>
        <ol className="mt-3.5 grid gap-2.5 md:grid-cols-2 lg:mt-9 lg:grid-cols-4 lg:gap-4">
          {FIXES.map(([pain, fix], i) => (
            <li key={pain}>
              <Card className="flex h-full items-start gap-3.5 px-4 py-3.5 lg:flex-col lg:gap-3 lg:p-[22px]">
                <span className="flex size-[34px] shrink-0 items-center justify-center rounded-[10px] bg-teal-soft font-mono text-[13px] font-semibold text-teal lg:hidden">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="hidden lg:block">{FIX_ICONS[i]}</span>
                <div>
                  <div className="text-[13px] text-alert line-through decoration-alert/55 lg:text-[14px]">{pain}</div>
                  <div className="mt-[3px] text-[15px] font-extrabold leading-[1.4] lg:mt-3 lg:text-[16px]">{fix}</div>
                </div>
              </Card>
            </li>
          ))}
        </ol>
      </Wrap>
    </section>
  )
}
