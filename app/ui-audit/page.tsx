import { notFound } from 'next/navigation'
export const metadata = { robots: { index: false, follow: false } }
import { PageShell } from '@/components/layout/PageShell'
import { SectionCard } from '@/components/layout/PageHeader'
import { AppHeader } from '@/components/layout/AppHeader'
import { MobileBottomNav } from '@/components/layout/MobileBottomNav'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { FlowHeader } from '@/components/optimizer/FlowHeader'

// Temporary local QA fixture; excluded from the published change.
export default function AuditFixture() {
  if (process.env.VERCEL_ENV === 'production') notFound()
  return <div className="app-type min-h-screen bg-canvas pb-24">
    <AppHeader />
    <PageShell title="Your Gulf career, prepared" subtitle="Build your Career Profile once. Each target job keeps its own CV, cover letter and interview practice.">
      <section className="rounded-card bg-teal p-5 text-white">
        <p className="type-caption font-semibold uppercase tracking-wider">Your next step</p>
        <h2 className="mt-2 type-section">Prepare a CV for your target job</h2>
        <p className="mt-3 type-body text-teal-soft">Choose the job you want to apply for. We will use your real experience to prepare a tailored CV.</p>
        <Button className="mt-4 w-full">Choose my target job and prepare my application</Button>
      </section>
      <SectionCard title="Your Career Profile" helper="Check these details before preparing your application.">
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Current job title" defaultValue="Senior Instrumentation & Control Commissioning Engineer" hint="Use the title from your employment record." requiredMark />
          <Input label="Target country" defaultValue="Saudi Arabia" optional />
        </div>
        <p className="mt-4 text-[12px] text-ink-muted">Your employers, job titles and dates remain unchanged. Review every suggested addition before using it.</p>
      </SectionCard>
      <section className="rounded-card border border-line bg-white p-5">
        <h2 className="type-section text-ink">Your target jobs</h2>
        <p className="mt-2 type-helper text-ink-muted">Each application has its own documents and preparation.</p>
        <a href="#target" className="mt-4 block break-words type-card text-ink">Lead Instrumentation and Control Commissioning Engineer — Green Hydrogen Project</a>
        <p className="mt-2 type-helper text-ink-muted">Engineering, Procurement and Construction Contractor · Saudi Arabia</p>
        <div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant="secondary">Open application</Button><Button size="sm" variant="progress">Continue interview practice</Button></div>
      </section>
      <section id="target"><FlowHeader step={1} title="Add your target job" subtitle="Paste the job description so your CV is prepared for the right role." /></section>
      <section data-document-preview style={{fontFamily:'Georgia, serif',fontSize:'11px',lineHeight:1.3}} className="rounded border bg-white p-4">
        <p className="text-[12px]" style={{fontSize:'11px'}}>Document preview control — this must remain 11px.</p>
      </section>
    </PageShell>
    <MobileBottomNav />
  </div>
}
