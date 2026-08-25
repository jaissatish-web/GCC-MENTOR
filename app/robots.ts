import type { MetadataRoute } from 'next'

/**
 * robots.txt (2026-08-19).
 *
 * The signed-in app is disallowed, not because it is secret — middleware.ts
 * already refuses it without a session — but because those URLs are worthless
 * in an index: a crawler only ever receives a login redirect from them, and
 * letting them compete with the real marketing pages weakens both.
 *
 * /admin is listed for the same reason and not as a security measure. robots.txt
 * is a public file and a request, never a control; the actual protection is the
 * server-side admin check on every action.
 */
const SITE_URL = process.env.NEXT_PUBLIC_APP_URL ?? 'https://gcc-mentor.vercel.app'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: [
        '/api/',
        '/admin',
        '/dashboard',
        '/profile',
        '/optimize',
        '/package',
        '/settings',
        '/payments',
        '/onboarding',
      ],
    },
    sitemap: `${SITE_URL}/sitemap.xml`,
  }
}
