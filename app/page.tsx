import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card'
import { Pill } from '@/components/ui/Pill'

// Landing page — converted 1:1 from design-reference/Landing Page.dc.html.
// Product name is an open decision; it ships as the literal string
// "[Product Name]" (docs/RULES.md §5). Founder photo slots are plain
// placeholder divs until real assets exist.

const NAV_LINKS = [
  { href: '#problem', label: 'The problem' },
  { href: '#how', label: 'How it works' },
  { href: '#proof', label: 'See the change' },
  { href: '#pricing', label: 'Pricing' },
]

const HERO_TRUST = [
  'Razorpay secured payment',
  'Passport & visa data encrypted',
  'Nothing invented — ever',
]

const HERO_STATS = [
  { value: '6', label: 'Gulf CV formats supported' },
  { value: '<60s', label: 'From click to preview' },
  { value: '0', label: 'Invented facts' },
]

const APPLICATIONS = [
  {
    n: '100',
    bg: 'bg-midnight',
    text: 'text-marble',
    w: 'w-full',
    label: 'you send',
    sub: 'applications',
  },
  {
    n: '62',
    bg: 'bg-deep-navy',
    text: 'text-marble',
    w: 'w-[62%]',
    label: 'parsed correctly',
    sub: 'ATS reads the file',
  },
  {
    n: '24',
    bg: 'bg-gold',
    text: 'text-midnight',
    w: 'w-[24%] min-w-[44px]',
    label: 'keyword-matched',
    sub: 'shortlist filter',
  },
  {
    n: '9',
    bg: 'bg-emerald',
    text: 'text-marble',
    w: 'w-[9%] min-w-[44px]',
    label: 'read by a human',
    sub: 'recruiter opens it',
  },
  {
    n: '2',
    bg: 'bg-terracotta',
    text: 'text-marble',
    w: 'w-[2%] min-w-[44px]',
    label: 'called back',
    sub: 'where you started',
  },
]

const PROBLEM_CARDS = [
  {
    title: 'One CV sent to every job',
    body: 'A generic resume matches no posting well. Recruiters filter on the words in their job description, not yours.',
  },
  {
    title: 'Wrong format for the region',
    body: 'Gulf employers expect details a Western CV leaves out — visa status, notice period, nationality, photo. Missing them looks unprepared.',
  },
  {
    title: "No idea if you're competitive",
    body: 'You apply into silence and never learn whether you were close or nowhere near. No feedback, no way to improve.',
  },
]

const PRICE_CHECKS = [
  'Gulf-format CV, reframed for your target role',
  'Full before/after view — you approve every line',
  'PDF + Word download, re-download anytime',
  'Saved to your Library with application status',
  'Career Profile kept — next job takes a minute',
]

const COMING_NEXT = [
  {
    label: 'ATS score against a posting',
    meta: 'Free',
    row: 'bg-state-emerald-bg',
    metaCls: 'text-emerald',
  },
  { label: 'Cover letter from your profile', meta: 'Phase 3', row: 'bg-fill-warm' },
  { label: 'Interview questions from your CV', meta: 'Phase 4', row: 'bg-fill-warm' },
  { label: 'Spoken mock interview + review', meta: 'Phase 4', row: 'bg-fill-warm' },
]

const FAQ = [
  {
    q: 'Will it lie on my CV?',
    a: "No. It can only use facts you provided. It rewrites how they're framed, never what they are.",
  },
  {
    q: 'Do I need the job description?',
    a: 'No, but it helps a lot. Without one we optimize to your title, industry and target country.',
  },
  {
    q: 'Is my passport data safe?',
    a: 'Encrypted, access-logged, and deletable by you at any time. You also choose which fields appear on the CV at all.',
  },
  {
    q: 'Does it work on my phone?',
    a: "It's built phone-first — including the download and WhatsApp sharing.",
  },
]

const FOUNDER_CHIPS = [
  'No hidden fees',
  'No auto-renewal',
  'Delete your data anytime',
  'Founder replies within a day',
]

function Kicker({ children, light = false }: { children: React.ReactNode; light?: boolean }) {
  return (
    <div
      className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${
        light ? 'text-gold-light' : 'text-ink-warm'
      }`}
    >
      {children}
    </div>
  )
}

export default function Home() {
  return (
    <div className="w-full max-w-[1280px] mx-auto bg-marble">
      {/* ─── Nav ─────────────────────────────────────────────── */}
      <header className="sticky top-0 z-20 h-16 border-b border-sand/15 bg-midnight/95 px-4 backdrop-blur sm:px-8">
        <div className="flex h-full items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="font-serif flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-midnight">
              P
            </div>
            <div className="text-sm font-semibold text-marble">[Product Name]</div>
          </div>
          <nav className="hidden items-center gap-6 md:flex">
            {NAV_LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="text-[13px] font-medium text-marble/70 transition-colors hover:text-gold-light"
              >
                {l.label}
              </a>
            ))}
          </nav>
          <Button variant="purchase" className="px-5">
            Start — ₹499
          </Button>
        </div>
      </header>

      {/* ─── Hero ────────────────────────────────────────────── */}
      <section className="grid items-center gap-14 bg-midnight px-4 py-14 sm:px-12 sm:py-[66px] lg:grid-cols-[1fr_minmax(0,440px)]">
        <div className="flex flex-col gap-5">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-gold/40 bg-emerald/30 px-[13px] py-[7px]">
            <div className="h-[6px] w-[6px] rounded-full bg-gold" />
            <div className="text-[11px] font-semibold uppercase tracking-[0.09em] text-gold-light">
              Saudi · UAE · Qatar · Oman · Kuwait · Bahrain
            </div>
          </div>
          <h1 className="font-serif max-w-[640px] text-[40px] leading-[1.02] text-marble md:text-[62px]">
            Your resume isn&apos;t the problem. Its format is.
          </h1>
          <p className="max-w-[560px] text-[17px] leading-relaxed text-marble/75">
            Gulf employers screen thousands of CVs with software before a human sees one. We
            rebuild yours in the format they expect and reframe it for the exact role you&apos;re
            chasing — using only the facts you already have.
          </p>
          <div className="mt-1 flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:gap-[18px]">
            <Button variant="purchase" className="px-7">
              Optimize my resume — ₹499
            </Button>
            <div className="text-[13px] leading-snug text-marble/60">
              One-time. No subscription.
              <br />
              Ready in about 2 minutes.
            </div>
          </div>
          <div className="mt-3 flex flex-wrap gap-6 border-t border-sand/15 pt-5">
            {HERO_TRUST.map((t) => (
              <div
                key={t}
                className="flex items-center gap-2 text-xs font-medium text-marble/65"
              >
                <span className="text-gold">◈</span> {t}
              </div>
            ))}
          </div>
        </div>

        {/* Before/after card */}
        <div className="flex flex-col gap-3">
          <Card className="flex flex-col gap-[11px] p-5 shadow-[0_26px_56px_rgba(0,0,0,0.32)]">
            <div className="flex items-center justify-between">
              <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-warm">
                The same line, before &amp; after
              </div>
              <div className="font-mono text-[10px] text-emerald">match 58% → 91%</div>
            </div>
            <div className="rounded-[10px] border-l-2 border-terracotta/70 bg-fill-subtle p-[13px]">
              <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-terracotta">
                What you wrote
              </div>
              <div className="text-xs leading-relaxed text-ink-muted">
                Responsible for instrumentation works and coordination with other departments on
                site.
              </div>
            </div>
            <div className="rounded-[10px] border-l-2 border-emerald bg-state-emerald-bg p-[13px]">
              <div className="mb-1.5 text-[9px] font-semibold uppercase tracking-[0.1em] text-emerald">
                What a hiring manager needed to read
              </div>
              <div className="text-xs leading-relaxed text-midnight">
                Executed{' '}
                <span className="rounded-[3px] bg-diff-added px-[3px]">pre-commissioning</span> of
                400+ field instruments across 3 gas trains, closing punch items with{' '}
                <span className="rounded-[3px] bg-diff-added px-[3px]">client QA/QC</span>{' '}
                witness.
              </div>
            </div>
            <div className="text-[10.5px] leading-snug text-ink-warm">
              Same job. Same facts. Nothing added.
            </div>
          </Card>
          <div className="flex gap-2.5">
            {HERO_STATS.map((s) => (
              <div
                key={s.value}
                className="flex flex-1 flex-col gap-[3px] rounded-xl border border-sand/15 bg-marble/5 p-3.5"
              >
                <span className="font-mono text-[19px] text-gold-light">{s.value}</span>
                <span className="text-[10.5px] leading-snug text-marble/60">{s.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Where applications die ──────────────────────────── */}
      <section id="problem" className="flex flex-col gap-9 bg-marble px-4 py-16 sm:px-12 sm:py-20">
        <div className="flex max-w-[720px] flex-col gap-2.5">
          <Kicker>Where applications die</Kicker>
          <h2 className="font-serif max-w-[640px] text-[34px] leading-[1.08] text-midnight md:text-[42px]">
            You send 100 applications. Two people ever reply.
          </h2>
          <p className="text-[15px] leading-relaxed text-ink-body">
            It isn&apos;t bad luck, and it usually isn&apos;t your experience. Here is what
            actually happens to a CV between &quot;Apply&quot; and a phone call.
          </p>
        </div>
        <div className="grid items-center gap-9 lg:grid-cols-[1.15fr_1fr]">
          <Card className="flex flex-col gap-4 p-6 sm:p-[30px]">
            <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-ink-warm">
              100 applications, tracked
            </div>
            <div className="flex flex-col gap-3.5">
              {APPLICATIONS.map((r) => (
                <div
                  key={r.n}
                  className="grid grid-cols-1 items-center gap-2 sm:grid-cols-[1fr_150px] sm:gap-3.5"
                >
                  <div className="flex">
                    <div
                      className={`flex h-11 items-center justify-center rounded-lg font-mono text-[15px] ${r.bg} ${r.text} ${r.w}`}
                    >
                      {r.n}
                    </div>
                  </div>
                  <div className="flex flex-col gap-px">
                    <span className="text-xs font-semibold text-midnight">{r.label}</span>
                    <span className="font-mono text-[10.5px] text-ink-warm">{r.sub}</span>
                  </div>
                </div>
              ))}
            </div>
            <div className="border-t border-dashed border-line pt-3.5 text-[12.5px] leading-relaxed text-ink-body">
              Almost the entire drop happens in the two steps you can actually control:{' '}
              <strong className="text-midnight">how your CV is parsed</strong>, and{' '}
              <strong className="text-midnight">whether it speaks the posting&apos;s language</strong>
              . That is exactly what this platform fixes.
            </div>
          </Card>
          <div className="flex flex-col gap-3">
            {PROBLEM_CARDS.map((c) => (
              <Card key={c.title} className="flex flex-col gap-[7px] p-5">
                <div className="text-[15px] font-bold text-midnight">{c.title}</div>
                <div className="text-[13px] leading-relaxed text-ink-body">{c.body}</div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Western vs Gulf CV ─────────────────────────────── */}
      <section className="flex flex-col gap-8 bg-sand px-4 py-16 sm:px-12 sm:py-20">
        <div className="flex max-w-[760px] flex-col gap-2.5">
          <Kicker>Why a Gulf CV is a different document</Kicker>
          <h2 className="font-serif text-[32px] leading-[1.08] text-midnight md:text-[40px]">
            The same experience, arranged the way the region reads it
          </h2>
        </div>
        <div className="grid items-stretch gap-0 lg:grid-cols-[1fr_64px_1fr]">
          {/* Western CV */}
          <Card className="flex flex-col gap-3.5 p-6 opacity-90 sm:p-[26px]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-ink-body">Typical Western CV</span>
              <Pill variant="applied" className="text-terracotta">
                Filtered out
              </Pill>
            </div>
            <div className="flex flex-col gap-2">
              {['Name & email', 'Objective statement', 'Experience (duties)', 'Education'].map(
                (row) => (
                  <div
                    key={row}
                    className="rounded-[9px] bg-fill-warm px-[13px] py-[11px] text-[12.5px] font-medium text-ink-body"
                  >
                    {row}
                  </div>
                )
              )}
              {['✕ No photo', '✕ No nationality', '✕ No visa / notice period'].map((row) => (
                <div
                  key={row}
                  className="rounded-[9px] border border-dashed border-state-terra-line bg-state-terra-bg px-[13px] py-[11px] text-[12.5px] font-medium text-state-terra-text"
                >
                  {row}
                </div>
              ))}
            </div>
          </Card>

          {/* Divider */}
          <div className="hidden flex-col items-center justify-center gap-2 lg:flex">
            <div className="h-full w-px flex-1 bg-line-strong" />
            <div className="font-sans flex h-11 w-11 items-center justify-center rounded-full bg-midnight text-[17px] font-semibold text-gold">
              →
            </div>
            <div className="h-full w-px flex-1 bg-line-strong" />
          </div>

          {/* Gulf CV */}
          <Card className="flex flex-col gap-3.5 border-emerald p-6 shadow-[0_18px_40px_rgba(14,92,74,0.12)] sm:p-[26px]">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-midnight">Gulf-format CV</span>
              <Pill variant="grounded">Shortlist-ready</Pill>
            </div>
            <div className="flex flex-col gap-2">
              {[
                'Photo + name + target title',
                'Nationality · DOB · location',
                'Visa status · transferability',
                'Notice period · passport validity',
              ].map((row) => (
                <div
                  key={row}
                  className="rounded-[9px] bg-state-emerald-bg px-[13px] py-[11px] text-[12.5px] font-semibold text-midnight"
                >
                  {row}
                </div>
              ))}
              {[
                'Summary written for the target role',
                "Achievements in the posting's language",
                'Skills ordered by relevance',
              ].map((row) => (
                <div
                  key={row}
                  className="rounded-[9px] bg-state-gold-bg px-[13px] py-[11px] text-[12.5px] font-semibold text-state-gold-text"
                >
                  {row}
                </div>
              ))}
            </div>
            <div className="text-[11.5px] leading-relaxed text-ink-warm">
              Every field has a show/hide switch — what Qatar expects isn&apos;t always what you
              want to send to a UK contractor.
            </div>
          </Card>
        </div>
      </section>

      {/* ─── How it works ───────────────────────────────────── */}
      <section id="how" className="flex flex-col gap-9 bg-marble px-4 py-16 sm:px-12 sm:py-20">
        <div className="flex max-w-[720px] flex-col gap-2.5">
          <Kicker>How it works</Kicker>
          <h2 className="font-serif text-[32px] leading-[1.08] text-midnight md:text-[40px]">
            Four steps. Under two minutes. Once.
          </h2>
          <p className="text-[15px] leading-relaxed text-ink-body">
            You build your Career Profile a single time. Every future application reuses it — no
            re-uploading, no retyping.
          </p>
        </div>
        <div className="grid items-start gap-8 sm:grid-cols-2 lg:grid-cols-4 lg:gap-0">
          {/* Step 1 */}
          <Step num="1" title="Give us what you have" last={false}>
            <p className="text-[13px] leading-relaxed text-ink-body">
              Upload a resume or LinkedIn PDF, paste the text, or start from scratch. Add a photo
              — Gulf CVs expect one.
            </p>
            <div className="flex flex-col gap-[7px] rounded-xl border border-line bg-white p-3.5">
              <div className="rounded-lg border border-state-emerald-line bg-state-emerald-bg px-[11px] py-[9px] text-[11px] font-semibold text-emerald">
                ↑ Upload file
              </div>
              <div className="rounded-lg bg-fill-warm px-[11px] py-[9px] text-[11px] font-medium text-ink-body">
                ¶ Paste text
              </div>
              <div className="rounded-lg bg-fill-warm px-[11px] py-[9px] text-[11px] font-medium text-ink-body">
                ✎ Fill manually
              </div>
            </div>
          </Step>

          {/* Step 2 */}
          <Step num="2" title="Confirm your profile" last={false}>
            <p className="text-[13px] leading-relaxed text-ink-body">
              We extract your history into structured fields. You correct anything wrong and watch
              your readiness score climb.
            </p>
            <div className="flex items-center gap-[13px] rounded-xl border border-line bg-white p-3.5">
              <div className="relative h-14 w-14 flex-none">
                <svg viewBox="0 0 100 100" className="h-14 w-14 -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" strokeWidth={9} className="stroke-sand" />
                  <circle
                    cx="50"
                    cy="50"
                    r="42"
                    fill="none"
                    strokeWidth={9}
                    strokeLinecap="round"
                    strokeDasharray="264"
                    strokeDashoffset={66}
                    className="stroke-gold"
                  />
                </svg>
                <div className="font-mono absolute inset-0 flex items-center justify-center text-[13px] text-midnight">
                  75
                </div>
              </div>
              <div className="text-[11.5px] leading-snug text-ink-body">
                Readiness score — weighted for your situation, never a gate.
              </div>
            </div>
          </Step>

          {/* Step 3 */}
          <Step num="3" title="Name the target" last={false}>
            <p className="text-[13px] leading-relaxed text-ink-body">
              Job title, country, and optionally the company and the job description. Then choose
              how hard we push the framing.
            </p>
            <div className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3.5">
              <div className="flex flex-wrap gap-[5px]">
                <span className="rounded-full bg-midnight px-[9px] py-[6px] text-[10px] font-semibold text-marble">
                  Qatar
                </span>
                {['KSA', 'UAE', '+3'].map((c) => (
                  <span
                    key={c}
                    className="rounded-full bg-fill-subtle px-[9px] py-[6px] text-[10px] font-medium text-ink-body"
                  >
                    {c}
                  </span>
                ))}
              </div>
              <div className="flex gap-[5px]">
                {['Easy', 'Moderate', 'High'].map((lvl, i) => (
                  <span
                    key={lvl}
                    className={`flex-1 rounded-[7px] py-[7px] text-center text-[10px] font-semibold ${
                      i === 1 ? 'bg-midnight text-marble' : 'bg-fill-subtle text-ink-body'
                    }`}
                  >
                    {lvl}
                  </span>
                ))}
              </div>
            </div>
          </Step>

          {/* Step 4 */}
          <Step num="4" title="See the change, then download" gold last>
            <p className="text-[13px] leading-relaxed text-ink-body">
              Review every rewritten line side by side, edit anything, pay once, download PDF and
              Word. It&apos;s saved for next time.
            </p>
            <div className="flex flex-col gap-[7px] rounded-xl border border-line bg-white p-3.5">
              <div className="rounded-lg bg-midnight px-[11px] py-[9px] text-center text-[11px] font-bold text-marble">
                Download PDF
              </div>
              <div className="rounded-lg border border-state-emerald-line bg-state-emerald-bg px-[11px] py-[9px] text-center text-[11px] font-semibold text-emerald">
                Share to WhatsApp
              </div>
            </div>
          </Step>
        </div>
      </section>

      {/* ─── What we change / never touch ───────────────────── */}
      <section id="proof" className="flex flex-col gap-8 bg-midnight px-4 py-16 sm:px-12 sm:py-20">
        <div className="flex max-w-[760px] flex-col gap-2.5">
          <Kicker light>What we change — and what we never touch</Kicker>
          <h2 className="font-serif text-[32px] leading-[1.08] text-marble md:text-[40px]">
            A real expert sharpens your framing. They don&apos;t invent your career.
          </h2>
          <p className="text-[15px] leading-relaxed text-marble/70">
            This is the line that keeps you safe in an interview — and it is enforced in every
            single generation, at every optimization level.
          </p>
        </div>
        <div className="grid gap-3.5 md:grid-cols-3">
          <div className="flex flex-col gap-3 rounded-2xl border border-gold/40 bg-gold/10 p-6">
            <div className="flex items-center gap-2">
              <span className="font-sans flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-gold text-[13px] font-bold text-midnight">
                ✎
              </span>
              <span className="text-sm font-bold text-gold-light">Rewritten</span>
            </div>
            <div className="flex flex-col gap-[7px]">
              <div className="text-[12.5px] leading-snug text-marble">Professional summary</div>
              <div className="text-[12.5px] leading-snug text-marble">Work description bullets</div>
            </div>
            <div className="text-[11.5px] leading-relaxed text-marble/60">
              Reframed to emphasise what this specific role cares about — using only facts already
              in that job entry.
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-state-emerald-line/40 bg-emerald/20 p-6">
            <div className="flex items-center gap-2">
              <span className="font-sans flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-emerald text-[13px] font-bold text-marble">
                ↕
              </span>
              <span className="text-sm font-bold text-state-emerald-line">Reordered only</span>
            </div>
            <div className="flex flex-col gap-[7px]">
              <div className="text-[12.5px] leading-snug text-marble">Skills list</div>
              <div className="text-[12.5px] leading-snug text-marble">Certifications list</div>
            </div>
            <div className="text-[11.5px] leading-relaxed text-marble/60">
              The most relevant items move to the top. Not one word is changed and nothing is
              added.
            </div>
          </div>
          <div className="flex flex-col gap-3 rounded-2xl border border-sand/20 bg-marble/5 p-6">
            <div className="flex items-center gap-2">
              <span className="font-sans flex h-[26px] w-[26px] items-center justify-center rounded-[7px] bg-marble text-[13px] font-bold text-midnight">
                🔒
              </span>
              <span className="text-sm font-bold text-marble">Never touched</span>
            </div>
            <div className="flex flex-col gap-[7px]">
              <div className="text-[12.5px] leading-snug text-marble">Employers, titles, dates</div>
              <div className="text-[12.5px] leading-snug text-marble">Education &amp; certificates</div>
              <div className="text-[12.5px] leading-snug text-marble">Contact, passport, visa</div>
            </div>
            <div className="text-[11.5px] leading-relaxed text-marble/60">
              Only you change these, in your profile — and the change flows into every document at
              once.
            </div>
          </div>
        </div>
        <div className="flex items-center gap-4 rounded-2xl border border-dashed border-gold/45 bg-marble/5 p-[22px]">
          <div className="font-serif text-[30px] leading-none text-gold">&ldquo;</div>
          <div className="max-w-[900px] text-sm leading-relaxed text-marble/80">
            If a claim isn&apos;t in your profile, it cannot appear in your resume. A closer
            keyword match never means a bigger claim — it means your real work is described in the
            words the employer is scanning for. You will be able to defend every line.
          </div>
        </div>
      </section>

      {/* ─── Founder ────────────────────────────────────────── */}
      <section className="grid items-center gap-11 bg-sand px-4 py-16 sm:px-12 sm:py-20 lg:grid-cols-2">
        <div className="flex flex-col gap-4">
          <Kicker>Built by someone who did the job</Kicker>
          <h2 className="font-serif text-[32px] leading-[1.1] text-midnight md:text-[36px]">
            Twelve years on Gulf megaprojects, watching good engineers get filtered out
          </h2>
          <p className="text-[14.5px] leading-relaxed text-ink-body">
            I worked instrumentation and commissioning on Gulf sites long enough to see the
            pattern: the engineers who got called weren&apos;t always the best on site — they were
            the ones whose CVs were readable by the system and written in the client&apos;s
            language. This platform is that unfair advantage, made ordinary.
          </p>
          <p className="text-[14.5px] leading-relaxed text-ink-body">
            This market is full of agents who take money and disappear. So: the price is on the
            homepage, there is no subscription, support is a real inbox I read myself, and the AI
            is forbidden from inventing anything about you.
          </p>
          <div className="mt-1 flex flex-wrap gap-2.5">
            {FOUNDER_CHIPS.map((chip) => (
              <Pill key={chip} className="border-line-strong bg-white px-3 py-2 text-midnight">
                {chip}
              </Pill>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-3">
          {/* Founder photo slots — plain placeholder divs (no real assets yet) */}
          <div className="flex h-[340px] items-center justify-center rounded-2xl bg-line">
            <span className="text-xs text-ink-faint">
              Founder photo — on site, or a Gulf plant/skyline
            </span>
          </div>
          <div className="flex gap-3">
            <div className="flex h-[110px] w-[110px] flex-none items-center justify-center rounded-xl bg-line">
              <span className="text-[10px] text-ink-faint">Portrait</span>
            </div>
            <div className="flex flex-1 flex-col justify-center gap-[5px] rounded-xl border border-line bg-white p-4">
              <div className="text-[13px] font-bold text-midnight">Founder — [Name]</div>
              <div className="text-[11.5px] leading-relaxed text-ink-body">
                I&amp;C / commissioning engineer. Jubail, Abu Dhabi, Doha. Now building this
                full-time.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── Pricing ────────────────────────────────────────── */}
      <section id="pricing" className="flex flex-col gap-[30px] bg-marble px-4 py-16 sm:px-12 sm:py-20">
        <div className="flex max-w-[700px] flex-col gap-2.5">
          <Kicker>Pricing</Kicker>
          <h2 className="font-serif text-[32px] leading-[1.08] text-midnight md:text-[40px]">
            One price. Everything visible before you pay.
          </h2>
        </div>
        <div className="grid items-start gap-5 lg:grid-cols-2">
          {/* Price card */}
          <div className="flex flex-col gap-[18px] rounded-[20px] bg-midnight p-[30px]">
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-[5px]">
                <span className="text-[15px] font-bold text-marble">Optimized Gulf CV</span>
                <span className="text-xs text-marble/60">Per job target</span>
              </div>
              <div className="flex flex-col items-end">
                <span className="font-mono text-[34px] leading-none text-gold-light">₹499</span>
                <span className="text-[11px] text-marble/55">one time</span>
              </div>
            </div>
            <div className="h-px bg-sand/15" />
            <div className="flex flex-col gap-2.5">
              {PRICE_CHECKS.map((c) => (
                <div
                  key={c}
                  className="flex gap-2.5 text-[13px] leading-snug text-marble/80"
                >
                  <span className="text-state-emerald-line">✓</span> {c}
                </div>
              ))}
            </div>
            <Button variant="purchase" className="w-full">
              Start now — ₹499
            </Button>
            <div className="text-center text-[11px] leading-snug text-marble/55">
              Razorpay · UPI, card, netbanking. Taxes included. No card stored.
            </div>
          </div>

          {/* Coming next + FAQ */}
          <div className="flex flex-col gap-3.5">
            <Card className="flex flex-col gap-3 p-6">
              <div className="text-sm font-bold text-midnight">
                Coming next — and what it will cost
              </div>
              <div className="flex flex-col gap-[9px]">
                {COMING_NEXT.map((row) => (
                  <div
                    key={row.label}
                    className={`flex items-center justify-between rounded-[10px] px-[13px] py-[11px] ${
                      row.row ?? 'bg-fill-warm'
                    }`}
                  >
                    <span
                      className={`text-[12.5px] font-semibold ${
                        row.meta === 'Free' ? 'text-emerald' : 'text-midnight'
                      }`}
                    >
                      {row.label}
                    </span>
                    <span
                      className={`text-[11px] font-bold ${
                        row.meta === 'Free' ? 'text-emerald' : 'font-medium text-ink-warm'
                      }`}
                    >
                      {row.meta}
                    </span>
                  </div>
                ))}
              </div>
              <div className="text-[11.5px] leading-relaxed text-ink-warm">
                We ship one thing properly at a time. Nothing here is charged for until it exists.
              </div>
            </Card>
            <Card className="flex flex-col gap-3.5 p-6">
              <div className="text-sm font-bold text-midnight">Questions people ask first</div>
              <div className="flex flex-col gap-[11px]">
                {FAQ.map((f) => (
                  <div key={f.q} className="flex flex-col gap-[3px]">
                    <span className="text-[12.5px] font-semibold leading-snug text-midnight">
                      {f.q}
                    </span>
                    <span className="text-xs leading-relaxed text-ink-body">{f.a}</span>
                  </div>
                ))}
              </div>
            </Card>
          </div>
        </div>
      </section>

      {/* ─── Closing CTA + footer ───────────────────────────── */}
      <section className="flex flex-col items-center gap-[26px] bg-midnight px-4 py-16 text-center sm:px-12">
        <h2 className="font-serif max-w-[720px] text-[34px] leading-[1.08] text-marble md:text-[42px]">
          The next posting you see deserves a CV written for it
        </h2>
        <p className="max-w-[560px] text-[15px] leading-relaxed text-marble/70">
          Build your profile once. Two minutes per application after that.
        </p>
        <Button variant="purchase" className="px-9">
          Optimize my resume — ₹499
        </Button>
        <div className="mt-2 flex w-full flex-wrap items-center justify-center gap-[22px] border-t border-sand/15 pt-6">
          <span className="text-xs text-marble/50">© [Product Name]</span>
          <a href="#pricing" className="text-xs text-marble/50 hover:text-gold-light">
            Pricing
          </a>
          <a href="#problem" className="text-xs text-marble/50 hover:text-gold-light">
            Why it matters
          </a>
          <span className="text-xs text-marble/50">Privacy · Terms · Refunds</span>
          <span className="text-xs text-marble/50">Support: email the founder</span>
        </div>
      </section>
    </div>
  )
}

function Step({
  num,
  title,
  gold = false,
  last,
  children,
}: {
  num: string
  title: string
  gold?: boolean
  last?: boolean
  children: React.ReactNode
}) {
  return (
    <div className={`flex flex-col gap-3.5 ${!last ? 'lg:pr-[22px]' : ''}`}>
      <div className="flex items-center gap-2.5">
        <div
          className={`font-mono flex h-[38px] w-[38px] flex-none items-center justify-center rounded-full text-sm ${
            gold ? 'bg-gold text-midnight' : 'bg-midnight text-gold-light'
          }`}
        >
          {num}
        </div>
        {!last ? <div className="h-0.5 flex-1 bg-line" /> : null}
      </div>
      <div className="text-[16px] font-bold leading-tight text-midnight">{title}</div>
      {children}
    </div>
  )
}
