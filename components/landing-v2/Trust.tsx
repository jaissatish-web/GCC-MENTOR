import Image from 'next/image'
import { Bar, Card, Eyebrow, H2, Lead, Wrap } from './ui'
import { FOUNDER } from './data'

function Lock() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" aria-hidden="true">
      <rect x="5" y="11" width="14" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  )
}

export function Trust() {
  return (
    <section id="trust" className="py-10 lg:py-[104px]">
      <Wrap className="grid gap-[18px] lg:grid-cols-2 lg:items-center lg:gap-16">
        <div>
          <Eyebrow>Why you can trust it</Eyebrow>
          <H2>
            Your Career Profile is <em>the source of truth.</em>
          </H2>
          <Lead>
            Generic AI writers fill gaps with whatever sounds good. GCC Mentor writes only from what your profile says,
            checks the result, and shows you anything new before it can reach your CV.
          </Lead>
          <div className="mt-5 grid grid-cols-2 gap-2.5 lg:mt-7 lg:gap-3">
            <div className="rounded-[14px] border border-[#EBCFC9] bg-[#FBF1EF] p-3.5 lg:p-[18px]">
              <div className="font-mono text-[10px] text-alert lg:text-[11px]">GENERIC AI WRITER</div>
              <ul className="mt-2 text-[13px] leading-[1.6] text-[#6E2A21] lg:text-[14px] lg:leading-[1.8]">
                <li>Adds skills you don&apos;t have</li>
                <li className="hidden sm:list-item">Rewrites titles and dates</li>
                <li className="hidden sm:list-item">Sounds good, fails the check</li>
              </ul>
            </div>
            <div className="rounded-[14px] border border-[#C9DCD6] bg-teal-soft p-3.5 lg:p-[18px]">
              <div className="font-mono text-[10px] text-teal lg:text-[11px]">GCC MENTOR</div>
              <ul className="mt-2 text-[13px] leading-[1.6] text-teal lg:text-[14px] lg:leading-[1.8]">
                <li>Writes only from your profile</li>
                <li className="hidden sm:list-item">Employers, titles, dates fixed</li>
                <li>You confirm every addition</li>
              </ul>
            </div>
          </div>
          <ul className="mt-6 hidden gap-x-5 gap-y-2.5 text-[14px] text-ink-soft md:grid md:grid-cols-2">
            <li><b className="text-ink">Facts stay fixed.</b> Employers, titles, dates and education are never rewritten.</li>
            <li><b className="text-ink">Checked against your profile.</b> Unsupported claims are not used.</li>
            <li><b className="text-ink">You confirm additions.</b> Suggested lines are highlighted.</li>
            <li><b className="text-ink">You review before you send.</b> Delete all your data any time.</li>
          </ul>
        </div>

        {/* A picture of the review page — not a working control, so nothing here is a button. */}
        <Card className="p-4 lg:p-7" >
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className="font-display text-[19px] font-semibold lg:text-[22px]">Senior Mechanical Engineer</div>
              <div className="text-[12.5px] text-ink-muted lg:text-[13px]">Fictional example CV · review page</div>
            </div>
            <span className="shrink-0 rounded-full bg-teal px-3 py-1.5 text-[12px] font-extrabold text-white">Review mode</span>
          </div>
          <div className="mt-4 flex flex-col gap-2 text-[13.5px] lg:mt-5 lg:gap-2.5 lg:text-[14px]">
            {(
              [
                [<><b>Gulf Energy Contracting</b> · Dhahran</>, 'employer'],
                [<>Jan 2019 — Present</>, 'dates'],
              ] as const
            ).map(([label, key]) => (
              <div key={key} className="flex justify-between gap-3 rounded-[10px] border border-line bg-canvas px-3.5 py-3">
                <span>{label}</span>
                <span className="flex items-center gap-1.5 font-bold text-teal">
                  <Lock />
                  Locked
                </span>
              </div>
            ))}
            <div className="rounded-[10px] border border-[#C4DDCD] bg-ok-soft px-3.5 py-3 leading-[1.6]">
              Led a 40-strong multidiscipline team through <b className="text-blue">pre-commissioning and handover</b> of two
              refinery units.
            </div>
            <div className="rounded-[10px] border border-dashed border-gold bg-gold-soft px-3.5 py-3 leading-[1.6]">
              <div>Suggested: “Worked to client engineering standards on refinery scopes.”</div>
              <div className="mt-2.5 flex flex-wrap gap-2" aria-hidden="true">
                <span className="inline-flex min-h-10 items-center rounded-[9px] bg-teal px-4 text-[13px] font-bold text-white">Yes, this is true</span>
                <span className="inline-flex min-h-10 items-center rounded-[9px] border border-line-strong bg-white px-4 text-[13px] font-bold text-ink">Remove it</span>
              </div>
              <p className="sr-only">A suggested line is kept only if you confirm it is true.</p>
            </div>
          </div>
        </Card>
      </Wrap>
    </section>
  )
}

const FEEDBACK = [
  ['Technical', 72, 'teal'],
  ['Role fit', 68, 'teal'],
  ['Gulf readiness', 61, 'gold'],
  ['Answer structure', 54, 'gold'],
] as const

export function InterviewPrep() {
  return (
    <section className="pb-10 lg:py-[104px]">
      <Wrap className="grid gap-[18px] lg:grid-cols-2 lg:items-center lg:gap-14">
        <div>
          <Eyebrow>Interview preparation</Eyebrow>
          <H2>
            Prepared from <em>the CV you actually sent.</em>
          </H2>
          <Lead className="hidden md:block">
            Questions and practice are built for this job, not from a generic list — so what you say in the interview
            matches what is on your CV.
          </Lead>
          <div className="mt-[22px] hidden flex-wrap gap-2 md:flex">
            {['Your Career Profile', 'The target job and its description', 'Your optimized CV'].map((p) => (
              <span key={p} className="rounded-full border border-line bg-white px-3.5 py-2 text-[13px] font-semibold text-ink-soft">
                {p}
              </span>
            ))}
          </div>
          <Card className="mt-[26px] hidden p-5 md:block">
            <div className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-teal text-[13px] font-extrabold text-white">Q</span>
              <div className="text-[15px] font-semibold leading-[1.55]">
                Tell me about a project where you worked to a client standard in the Gulf.
              </div>
            </div>
            <div className="mt-3 flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-gold-soft text-[11px] font-extrabold text-gold-ink">You</span>
              <div className="flex-1 rounded-[10px] bg-canvas px-3 py-2.5 text-[14px] leading-[1.55] text-ink-muted">
                Your written answer: the scope, the standard you followed, what you personally did, and the result.
              </div>
            </div>
          </Card>
        </div>
        <div className="relative lg:pb-0">
          <div className="relative h-[210px] overflow-hidden rounded-[20px] md:h-[320px] lg:h-[440px] lg:rounded-[22px] lg:shadow-[0_24px_60px_rgba(20,24,28,0.14)]">
            <Image src="/landing/phase3-interview-panel.jpg" alt="A candidate in front of an interview panel" fill sizes="(min-width: 1024px) 560px, 100vw" className="object-cover" />
          </div>
          <Card className="relative mx-3 -mt-[46px] flex flex-col gap-[7px] p-3.5 text-[12px] shadow-lp-float lg:absolute lg:-bottom-[30px] lg:-left-[30px] lg:m-0 lg:w-[290px] lg:gap-2 lg:p-[18px]">
            <div className="text-[13px] font-extrabold">Feedback on your answers · example</div>
            {FEEDBACK.map(([label, v, tone]) => (
              <div key={label} className="flex flex-col gap-[7px] lg:gap-2">
                <div className="flex justify-between">
                  <span>{label}</span>
                  <span className="font-mono">{v}</span>
                </div>
                <Bar value={v} tone={tone} />
              </div>
            ))}
          </Card>
        </div>
      </Wrap>
      <Wrap>
        <p className="mt-3 text-[12px] text-ink-muted lg:mt-14 lg:text-[13px]">
          Written answers only — no voice recording. Preparation guidance, not a hiring prediction.
        </p>
      </Wrap>
    </section>
  )
}

export function FounderBand() {
  return (
    <section className="pb-10 lg:pb-[104px]">
      <Wrap>
        <div className="relative overflow-hidden rounded-[22px] lg:min-h-[400px] lg:rounded-[26px]">
          <Image src="/landing/founder-refinery-night.jpg" alt="A Gulf refinery lit up at night" fill sizes="(min-width: 1024px) 1120px, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-[rgba(15,76,67,0.88)] lg:bg-[linear-gradient(90deg,rgba(15,76,67,0.97)_0%,rgba(15,76,67,0.85)_50%,rgba(15,76,67,0.25)_100%)]" />
          <div className="relative max-w-[640px] px-[22px] py-[26px] text-white lg:p-[60px]">
            <Eyebrow className="text-gold-soft">Built by engineers who understand Gulf careers</Eyebrow>
            <p className="mt-3 font-display text-[21px] font-medium leading-[1.35] lg:mt-[18px] lg:text-[30px] lg:leading-[1.3]">
              15+ years of Middle East EPC &amp; PMC experience — helping professionals present the right experience,
              skills and achievements clearly for Gulf employers.
            </p>
            {FOUNDER.name ? (
              <div className="mt-[18px] flex items-center gap-3 lg:mt-[26px] lg:gap-3.5">
                {FOUNDER.photo ? (
                  <Image src={FOUNDER.photo} alt={FOUNDER.name} width={56} height={56} className="size-[46px] rounded-full border-2 border-gold-soft object-cover lg:size-14" />
                ) : null}
                <div>
                  <div className="font-extrabold">{FOUNDER.name}</div>
                  <div className="text-[12.5px] opacity-85 lg:text-[14px]">{FOUNDER.role}</div>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </Wrap>
    </section>
  )
}
