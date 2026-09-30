'use client'

import { useEffect } from 'react'
import { AuthHashHandler } from '@/components/auth/AuthHashHandler'

/**
 * Safety net for emailed auth links that land on the HOME page (2026-09-30).
 *
 * When a link's redirect URL is not on Supabase's allow-list, Supabase drops it
 * and sends the user to the project's Site URL — the bare home page — with the
 * credential still attached: `/?code=…` (PKCE) or `/#access_token=…` (implicit)
 * or `/#error=…` (expired). The home page ignored all three, so the user saw
 * the landing page and nothing happened. This forwards each to the handler
 * that finishes it. Renders nothing unless a hash sign-in is in progress.
 */
export function AuthLinkCatcher() {
  useEffect(() => {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (code) {
      window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`)
      return
    }
    const tokenHash = url.searchParams.get('token_hash')
    const type = url.searchParams.get('type')
    if (tokenHash && type) {
      window.location.replace(`/auth/confirm?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(type)}`)
      return
    }
    if (/[#&]error(_code)?=/.test(url.hash)) {
      window.location.replace('/login?error=auth_callback_failed')
    }
  }, [])

  // `#access_token=…` is finished in place by the existing hash handler.
  return <AuthHashHandler />
}
