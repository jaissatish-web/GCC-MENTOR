/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    domains: ['dzazipqjrhupvyrvtpax.supabase.co'],
  },
  // Don't webpack-bundle these server-side packages — load them from node_modules at runtime.
  // Fixes "Can't resolve 'node-domexception'" caused by openai → formdata-node dependency
  // when node_modules were installed on a different OS (Linux → Windows).
  experimental: {
    serverComponentsExternalPackages: ['openai', 'formdata-node', 'node-domexception', 'puppeteer', 'puppeteer-core', '@puppeteer/browsers', 'pdf-parse', 'mammoth'],
  },
}

export default nextConfig
