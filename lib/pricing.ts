import { createClient } from '@/lib/supabase/server'

/**
 * Pricing lookup. Founder request: no price is ever hard-coded — every
 * amount comes from the `pricing` table (supabase/migrations/017_pricing.sql),
 * which the founder edits directly in the Supabase Table Editor. No admin UI,
 * no redeploy — a changed row is live on the next page load.
 *
 * Not cached: Server Components call this per-request via the standard
 * Supabase client, so a price change is visible immediately. If this becomes
 * a hot path later, add revalidation deliberately — do not pre-optimize.
 *
 * FALLBACK: no .env.local exists yet in local dev (docs/HERMES.md §3a), and
 * this table won't exist at all until migration 017 is applied. The fallback
 * below is what ships today, kept in sync with the migration's seed row —
 * it exists so the landing page never breaks, not as a second source of
 * truth. If the DB value changes, the DB wins; this is read-path safety net
 * only.
 */

export interface PriceEntry {
  key: string
  label: string
  amountInr: number
}

const FALLBACK: Record<string, PriceEntry> = {
  resume_optimization: {
    key: 'resume_optimization',
    label: 'Optimize resume for a job',
    amountInr: 499,
  },
}

export async function getPrice(key: string): Promise<PriceEntry> {
  try {
    const supabase = await createClient()
    const { data, error } = await supabase
      .from('pricing')
      .select('key, label, amount_inr')
      .eq('key', key)
      .maybeSingle()

    if (error || !data) {
      console.error('pricing lookup missed, using fallback: key=' + key, error?.message ?? 'no row')
      return FALLBACK[key] ?? { key, label: key, amountInr: 0 }
    }

    return { key: data.key, label: data.label, amountInr: data.amount_inr as number }
  } catch (e) {
    console.error('pricing lookup threw, using fallback: key=' + key, e instanceof Error ? e.message : String(e))
    return FALLBACK[key] ?? { key, label: key, amountInr: 0 }
  }
}

/** "499" -> "₹499". No decimals — every price in this product is whole rupees. */
export function formatInr(amountInr: number): string {
  return `₹${amountInr}`
}
