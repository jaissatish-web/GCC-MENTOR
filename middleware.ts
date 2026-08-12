import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

// Routes that require login. Must stay in sync with docs/USER_FLOW.md.
const PROTECTED_ROUTES = [
  '/dashboard',
  '/profile',
  '/optimize',
  '/package',
  '/settings',
  '/admin',
  '/gcc-readiness',
  '/job-match',
  '/cover-letter',
]

// Routes only for guests — redirect to the dashboard if already logged in.
const AUTH_ROUTES = ['/login', '/signup']

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  // Degrade gracefully when Supabase is not yet configured.
  //
  // Without this, a missing env var makes createServerClient throw and every
  // matched route returns HTTP 500 — which blocks all UI work until Supabase
  // is provisioned. Public routes must never depend on auth infrastructure.
  //
  // This is a development affordance only: PROTECTED_ROUTES are refused rather
  // than allowed through, so an unconfigured deployment cannot accidentally
  // expose an authenticated page.
  if (!url || !anonKey) {
    const isProtected = PROTECTED_ROUTES.some((route) =>
      request.nextUrl.pathname.startsWith(route)
    )
    if (isProtected) {
      console.error(
        '[middleware] Supabase env vars missing — refusing access to a protected route. ' +
          'Copy .env.example to .env.local and fill it in. See docs/INFRASTRUCTURE.md §5.'
      )
      return new NextResponse(
        'Supabase is not configured. See docs/INFRASTRUCTURE.md §5.',
        { status: 503 }
      )
    }
    return supabaseResponse
  }

  const supabase = createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(
        cookiesToSet: {
          name: string
          value: string
          options?: Record<string, unknown>
        }[]
      ) {
        cookiesToSet.forEach(({ name, value }) =>
          request.cookies.set(name, value)
        )
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(
            name,
            value,
            options as Parameters<typeof supabaseResponse.cookies.set>[2]
          )
        )
      },
    },
  })

  // Refresh the session if expired.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const pathname = request.nextUrl.pathname

  const isProtectedRoute = PROTECTED_ROUTES.some((route) =>
    pathname.startsWith(route)
  )
  if (isProtectedRoute && !user) {
    const loginUrl = new URL('/login', request.url)
    loginUrl.searchParams.set('redirectTo', pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isAuthRoute = AUTH_ROUTES.some((route) => pathname.startsWith(route))
  if (isAuthRoute && user) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // Admin gate (docs/ADMIN.md §1): "Check is_admin server-side in the route
  // handler AND in middleware." This is the first of the two independent
  // checks — lib/admin/adminAuth.ts's requireAdmin() is the second, run
  // inside the page/action itself. Never rely on a client-side check, and
  // never reveal /admin's existence to a non-admin: redirect to /dashboard,
  // the same place any other non-matching route sends a logged-in user.
  if (pathname.startsWith('/admin') && user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_admin')
      .eq('user_id', user.id)
      .maybeSingle()
    if (!profile || profile.is_admin !== true) {
      return NextResponse.redirect(new URL('/dashboard', request.url))
    }
  }

  return supabaseResponse
}

// Run only on routes that actually need an auth decision.
//
// The previous matcher ran on every route except static assets, which meant
// the public landing page paid for a Supabase round-trip on every request and
// broke entirely when Supabase was unreachable. Public pages are now never
// touched by middleware.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/profile/:path*',
    '/optimize/:path*',
    '/package/:path*',
    '/settings/:path*',
    '/admin/:path*',
    '/gcc-readiness/:path*',
    '/job-match/:path*',
    '/cover-letter/:path*',
    '/login',
    '/signup',
  ],
}
