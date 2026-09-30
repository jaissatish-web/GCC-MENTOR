import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { sameOriginRedirectUrl } from '@/lib/safeRedirect'

/**
 * /auth/confirm — emailed links that carry a TOKEN HASH (2026-09-30).
 *
 * WHY. /auth/callback uses the PKCE code, which only works in the browser that
 * asked for the email: request a reset on a laptop, open the email on a phone,
 * and the code cannot be exchanged — "link expired". A token-hash link is
 * verified on its own, so it works on any device.
 *
 * Used once the Supabase email templates point here (docs/SUPABASE_AUTH_SETUP.md):
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=recovery
 *   {{ .SiteURL }}/auth/confirm?token_hash={{ .TokenHash }}&type=signup
 *
 * A recovery link always opens /auth/update-password. Anything else goes to
 * `next` if it is a safe in-app path (lib/safeRedirect.ts), else the dashboard.
 */
const TYPES: EmailOtpType[] = ['signup', 'invite', 'magiclink', 'recovery', 'email_change', 'email']

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null

  if (tokenHash && type && TYPES.includes(type)) {
    const cookieStore = await cookies()
    const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2]),
          )
        },
      },
    })

    const { error } = await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
    if (!error) {
      const next = type === 'recovery' ? '/auth/update-password' : type === 'signup' ? searchParams.get('next') ?? '/onboarding' : searchParams.get('next')
      return NextResponse.redirect(sameOriginRedirectUrl(next, origin))
    }
  }

  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
