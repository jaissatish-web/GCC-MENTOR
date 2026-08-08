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

  // Don't webpack-bundle these server-side packages — load them from
  // node_modules at runtime. Required for the native/binary-dependent ones.
  experimental: {
    serverComponentsExternalPackages: [
      '@anthropic-ai/sdk',
      'puppeteer',
      'puppeteer-core',
      '@puppeteer/browsers',
      'pdf-parse',
      'mammoth',
      'docx',
    ],
  },
}

export default nextConfig
