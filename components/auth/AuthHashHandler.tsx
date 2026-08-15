'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

/**
 * Completes an implicit-flow auth link (Unplanned #20).
 *
 * Supabase can return a session in two shapes. `app/auth/callback/route.ts`
 * handles the PKCE one (`?code=` exchanged server-side). The other — used by
 * emailed magic links and recovery links on projects not configured for PKCE —
 * returns the tokens in the URL FRAGMENT (`#access_token=…`). A fragment is
 * never sent to the server, so a route handler structurally cannot read it, and
 * the callback was redirecting every such link to `?error=auth_callback_failed`.
 *
 * Confirmed live: Supabase authenticated the user correctly and issued a valid
 * JWT; only the app side dropped it. That means anyone clicking an emailed
 * magic link was being told sign-in failed when it had in fact succeeded.
 *
 * This runs on the login page, hands the tokens to the browser client so the
 * session cookie is written, and then clears the fragment via replaceState so a
 * refresh or a shared URL cannot replay credentials that are sitting in the
 * address bar.
 */
export function AuthHashHandler() {
  const router = useRouter()
  const [working, setWorking] = useState(false)

  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token=')) return

    const params = new URLSearchParams(hash.slice(1))
    const access_token = params.get('access_token')
    const refresh_token = params.get('refresh_token')
    if (!access_token || !refresh_token) return

    setWorking(true)
    // Strip the credentials from the address bar before anything async runs.
    window.history.replaceState(null, '', window.location.pathname + window.location.search)

    const supabase = createClient()
    supabase.auth
      .setSession({ access_token, refresh_token })
      .then(({ error }) => {
        if (error) {
          setWorking(false)
          return
        }
        // Full reload rather than a client push: middleware and every Server
        // Component need to see the freshly written session cookie.
        window.location.assign('/dashboard')
      })
      .catch(() => setWorking(false))
  }, [router])

  if (!working) return null

  return (
    <p className="mb-4 rounded-radius-md border border-line-light bg-surface-2-light px-4 py-3 text-center text-[13px] font-medium text-ink-700">
      Signing you in…
    </p>
  )
}
