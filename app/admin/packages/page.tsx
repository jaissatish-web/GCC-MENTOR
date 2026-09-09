import { requireAdmin } from '@/lib/admin/adminAuth'
import { listServicePackages } from '@/lib/admin/servicePackages'
import { createServicePackageAction, setServicePackageActiveAction } from '@/app/admin/actions'
import { ServicePackageItemsFields } from '@/components/admin/ServicePackageItemsFields'
import { Card } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { PageShell } from '@/components/layout/PageShell'

/**
 * Admin · Service packages (TASK-075 split — moved verbatim from the old
 * monolithic /admin page). Create and manage bundles of services. Same form,
 * same action, same behavior as before — this is a navigation restructure only.
 */
export default async function PackagesPage({
  searchParams,
}: {
  searchParams: { spSaved?: string; spError?: string }
}) {
  const admin = await requireAdmin()
  const { spSaved, spError } = searchParams

  const servicePackages = await listServicePackages()

  return (
    <PageShell
      title="Service packages"
      subtitle={`Signed in as ${admin.email ?? admin.id}`}
    >

      <Card className="flex flex-col gap-4 p-5">
        <h2 className="text-[13px] font-bold uppercase tracking-wide text-ink-muted">
          Service packages
        </h2>
        <p className="text-[12px] text-ink-muted">
          Create and manage bundles of services (e.g. &ldquo;Pro = 3 optimizations + 2 cover letters&rdquo;).
          Service keys must exactly match what the code checks for&mdash;currently known values:
          <code className="mx-1 rounded bg-canvas px-1.5 py-0.5 font-mono text-[12px]">resume_optimization</code>
          and
          <code className="mx-1 rounded bg-canvas px-1.5 py-0.5 font-mono text-[12px]">cover_letter</code>.
          A typo means the quota silently never matches any route.
        </p>

        {spSaved ? (
          <div className="rounded-card border border-teal/50 bg-teal-soft px-3.5 py-2.5 text-[12px] text-teal">
            Saved.
          </div>
        ) : null}
        {spError ? (
          <div className="rounded-card border border-alert/30 bg-alert-soft px-3.5 py-2.5 text-[12px] text-alert">
            {spError}
          </div>
        ) : null}

        {/* Create form */}
        <form action={createServicePackageAction} className="flex flex-col gap-3" id="create-service-package-form">
          <div className="flex flex-wrap gap-2">
            <Input name="name" label="Name" placeholder="e.g. Pro Package" required className="w-[200px]" />
            <Input name="description" label="Description" placeholder="e.g. For serious applicants" className="flex-1 min-w-[200px]" />
            <Input name="priceInr" type="number" min={0} label="Price (₹)" placeholder="e.g. 1499" required className="w-[140px]" />
          </div>
          <div className="flex flex-col gap-2">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">Quota line items</div>
            <p className="text-[12px] text-ink-muted">The service package is only available for purchase from here.</p>
            <ServicePackageItemsFields />
          </div>
          <Button type="submit" variant="primary" className="self-start">
            Create package
          </Button>
        </form>

        {/* Existing packages list */}
        {servicePackages.length > 0 ? (
          <div className="flex flex-col gap-2">
            <div className="text-[12px] font-semibold uppercase tracking-wide text-ink-muted">
              Existing packages
            </div>
            {servicePackages.map((p) => (
              <div key={p.id} className="flex flex-col gap-2 rounded-card border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-sm font-semibold text-ink">{p.name}</span>
                    <span className="text-[12px] text-ink-muted">
                      ₹{p.priceInr}{p.description ? ` · ${p.description}` : ''}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {p.isActive ? (
                      <form action={setServicePackageActiveAction}>
                        <input type="hidden" name="packageId" value={p.id} />
                        <input type="hidden" name="isActive" value="false" />
                        <button type="submit" className="text-[12px] font-semibold text-alert underline-offset-2 hover:underline">Deactivate</button>
                      </form>
                    ) : (
                      <form action={setServicePackageActiveAction}>
                        <input type="hidden" name="packageId" value={p.id} />
                        <input type="hidden" name="isActive" value="true" />
                        <button type="submit" className="text-[12px] font-semibold text-teal underline-offset-2 hover:underline">Activate</button>
                      </form>
                    )}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1">
                  {p.items.map((item) => (
                    <span key={item.serviceKey} className="rounded-md border border-line bg-canvas px-2 py-0.5 text-[12px] font-mono text-ink-soft">
                      {item.serviceKey} &times;{item.quota}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-ink-muted">No service packages created yet.</p>
        )}
      </Card>
    </PageShell>
  )
}
