import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { sameOriginRedirectUrl } from '@/lib/safeRedirect'

// Supabase redirects here after an emailed confirmation or recovery link (PKCE
// flow): the `code` is exchanged for a session, then the user is sent on.
//
// `next` is attacker-controllable, so it is NEVER concatenated onto the origin
// (audit H05): `${origin}${next}` with next = "@evil.example" is a different
// host. lib/safeRedirect.ts accepts only same-origin paths inside the app.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (code) {
    const cookieStore = await cookies()
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll()
          },
          setAll(cookiesToSet: { name: string; value: string; options?: Record<string, unknown> }[]) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options as Parameters<typeof cookieStore.set>[2])
            )
          },
        },
      }
    )

    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      // A recovery link that lost its `next` (Supabase drops the query when it
      // falls back to the Site URL) still opens the new-password screen: a
      // reset requested in the last hour means that is why the user is here.
      const sentAt = data.user?.recovery_sent_at ? Date.parse(data.user.recovery_sent_at) : NaN
      const recentRecovery = Number.isFinite(sentAt) && Date.now() - sentAt < 60 * 60 * 1000
      return NextResponse.redirect(sameOriginRedirectUrl(!next && recentRecovery ? '/auth/update-password' : next, origin))
    }
  }

  // An expired or already-used link lands here. The login page explains it.
  return NextResponse.redirect(new URL('/login?error=auth_callback_failed', origin))
}
