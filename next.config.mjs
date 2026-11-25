/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // Profile photos are served from Supabase Storage. Pattern-matched rather
    // than hard-coded to a project ID so the project can be swapped via env.
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
    ],
  },

  async headers() {
    return [{
      source: '/:path*',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        { key: 'Permissions-Policy', value: 'microphone=(self), camera=(), geolocation=()' },
        { key: 'Content-Security-Policy', value: "frame-ancestors 'self'" },
      ],
    }]
  },

  serverExternalPackages: [
    '@sparticuz/chromium',
    'puppeteer-core',
    '@puppeteer/browsers',
    'mammoth',
    'docx',
  ],

  // Chromium resolves its compressed runtime assets relative to its package.
  // The tracer cannot see those dynamic reads. Wildcards match dynamic IDs.
  outputFileTracingIncludes: {
    '/api/resume/pdf': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/packages/*/pdf': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/packages/*/file-check': ['./node_modules/@sparticuz/chromium/bin/**'],
    '/api/packages/*/cover-letter/*': ['./node_modules/@sparticuz/chromium/bin/**'],
  },
}

export default nextConfig
