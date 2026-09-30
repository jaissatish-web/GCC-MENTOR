import { SITE_URL } from '@/lib/siteUrl'

/**
 * The origin to put in an emailed auth link (confirm sign-up, reset password).
 *
 * The request's own Origin header first — it is the site the user is actually
 * on, so previews link back to previews. Without one, the configured SITE_URL
 * (production). NEVER localhost: the old fallback was `http://localhost:3000`,
 * which is a dead page on every phone that opens the email.
 *
 * Note: Supabase only honours this if the URL is on its Redirect URLs
 * allow-list; otherwise it silently uses the project's Site URL instead.
 * See docs/SUPABASE_AUTH_SETUP.md.
 */
export function authLinkOrigin(originHeader: string | null): string {
  if (originHeader) {
    try {
      const u = new URL(originHeader)
      if (u.protocol === 'https:' || u.hostname === 'localhost' || u.hostname === '127.0.0.1') return u.origin
    } catch {
      // fall through
    }
  }
  return SITE_URL
}
