import Link from 'next/link'

/**
 * Centred auth page shell (TASK-005): brand mark + [Product Name] on marble,
 * form card centred in the viewport.
 */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-marble px-6 py-16">
      <Link href="/" className="mb-8 flex items-center gap-2.5">
        <span className="font-serif flex h-7 w-7 items-center justify-center rounded-lg bg-gold text-base text-midnight">
          P
        </span>
        <span className="text-sm font-semibold text-midnight">[Product Name]</span>
      </Link>
      {children}
      <p className="mt-8 max-w-sm text-center text-[11px] leading-relaxed text-ink-warm">
        Only facts already in your profile are used anywhere in this product.
        Nothing is invented — ever.
      </p>
    </main>
  )
}
