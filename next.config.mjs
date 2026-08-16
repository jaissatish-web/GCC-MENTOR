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
      // @sparticuz/chromium ships a Chromium BINARY in its own bin/ directory
      // and locates it by walking up from its own module path. Webpack
      // relocates the JS into a chunk, the relative path stops resolving, and
      // every PDF download on Vercel failed with:
      //   The input directory "/vercel/path0/node_modules/@sparticuz/chromium/bin"
      //   does not exist. ... you must externalize @sparticuz/chromium
      // Its absence here is why TASK-125's serverless fix did not actually fix
      // the download. Externalising keeps the package loaded from node_modules
      // at runtime, bin/ intact.
      '@sparticuz/chromium',
      'puppeteer-core',
      // Vestigial: `puppeteer` is now a devDependency and is no longer imported
      // by application code (lib/pdf/browser.ts uses puppeteer-core). Left
      // listed so a stray import cannot silently get bundled.
      'puppeteer',
      '@puppeteer/browsers',
      'pdf-parse',
      'mammoth',
      'docx',
    ],

    // Externalising alone is NOT enough, and this is the part that would have
    // sent the same error back a second time.
    //
    // Next traces which files each route needs and uploads only those. For
    // @sparticuz/chromium it traced the five build/*.js files and stopped —
    // verified by reading .next/server/app/api/packages/[id]/pdf/route.js.nft.json
    // after a build. The actual browser lives in that package's bin/ directory
    // as Brotli archives (chromium.br is 62MB, plus swiftshader, fonts and the
    // AL2023 shim) and is only ever opened at runtime by a path the tracer
    // cannot see. Without this the bin/ directory is absent from the lambda,
    // which is precisely what the error reported.
    //
    // Scoped to the two routes that actually launch a browser, so no other
    // function carries 66MB it never uses.
    // Keys are GLOBS, which is the trap here: a literal '/api/packages/[id]/pdf'
    // key silently matches nothing, because `[id]` is read as a character class
    // (one character, either "i" or "d"), not as a dynamic segment. A wildcard
    // segment is what actually matches the route.
    //
    // Every claim here was established by re-reading
    // .next/server/app/api/packages/[id]/pdf/route.js.nft.json after a build,
    // not inferred from the config's shape - two earlier key formats looked
    // correct and traced zero files.
    //
    // Scoped to the two routes that launch a browser: a broader
    // '/api/packages/**' also works, but attaches 66MB of Chromium to /docx and
    // every other package route, none of which open a browser.
    outputFileTracingIncludes: {
      '/api/packages/*/pdf/**': ['./node_modules/@sparticuz/chromium/bin/**'],
      '/api/packages/*/preview-image/**': ['./node_modules/@sparticuz/chromium/bin/**'],
    },
  },
}

export default nextConfig
