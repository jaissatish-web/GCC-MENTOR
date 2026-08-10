import type { Config } from 'tailwindcss'

// Design tokens from docs/DESIGN.md §2-4.
// Extracted from the approved mockups in /design-reference/.
// Colour carries meaning consistently:
//   navy = action · gold = purchase & readiness · emerald = verified progress
//   terracotta = caution. Only two background tones: marble and navy.

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        midnight:   '#0A1A2F',
        'deep-navy': '#12283F',
        emerald:    '#0E5C4A',
        gold:       '#C79A3C',
        'gold-light': '#E3C77E',
        sand:       '#EDE3D2',
        marble:     '#FBF9F5',
        terracotta: '#A0562F',

        ink: {
          DEFAULT: '#0A1A2F',
          body:    '#5B6675',
          muted:   '#6B7A8D',
          warm:    '#93805F',
          faint:   '#A8A093',
        },
        line: {
          DEFAULT: '#E4DED2',
          strong:  '#DDD5C6',
          soft:    '#F1EEE8',
        },
        fill: {
          subtle: '#F4F1EA',
          warm:   '#F7F5F0',
        },

        // ── Dark-theme surfaces (2026-08-07 redesign) ────────────────────
        // The product is dark-first: a layered navy stack, warm gold accents.
        // Never write a raw hex in a component — add it here instead.
        //   void      = deepest page base
        //   surface   = standard raised card on void
        //   surface-2 = hover / higher elevation
        //   hairline  = 1px separator on dark (use /60 /40 for softer)
        void: '#050C16',
        surface: '#0D1D31',
        'surface-2': '#15304C',
        'surface-3': '#1D3A59',
        hairline: '#1E3550',

        // Semantic tints — status pills, callouts, diff highlighting
        state: {
          'emerald-bg':   '#EAF3EF',
          'emerald-line': '#C9E0D6',
          'gold-bg':      '#F7EFDC',
          'gold-line':    '#E3C77E',
          'gold-text':    '#8A6A1C',
          'terra-bg':     '#FCF3E8',
          'terra-line':   '#E8C79A',
          'terra-text':   '#7A4A24',
          'visa-bg':      '#E9EEF4',
          'visa-line':    '#C6D3E0',
          'visa-text':    '#2C4A6B',
        },
        diff: {
          added:   '#D3E8DE',
          removed: '#A89A8A',
        },
      },
      fontFamily: {
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        sans:  ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        lg:  '12px',
        xl:  '14px',
        '2xl': '18px',
        '3xl': '22px',
      },
      // Elevation + glow. On a dark base, depth comes from glow and layered
      // shadow rather than the soft grey shadows a light theme uses.
      boxShadow: {
        'elev-1': '0 1px 2px rgba(0,0,0,0.4), 0 4px 12px -4px rgba(0,0,0,0.5)',
        'elev-2': '0 4px 12px rgba(0,0,0,0.45), 0 12px 32px -8px rgba(0,0,0,0.6)',
        'elev-3': '0 8px 24px rgba(0,0,0,0.5), 0 28px 64px -12px rgba(0,0,0,0.7)',
        'glow-gold': '0 0 0 1px rgba(199,154,60,0.30), 0 6px 24px -6px rgba(199,154,60,0.45)',
        'glow-gold-lg': '0 0 0 1px rgba(199,154,60,0.35), 0 10px 44px -8px rgba(199,154,60,0.55)',
        'glow-emerald': '0 0 0 1px rgba(14,92,74,0.40), 0 6px 24px -6px rgba(14,92,74,0.45)',
        'inset-hairline': 'inset 0 1px 0 rgba(251,249,245,0.06)',
      },
      backgroundImage: {
        // Single soft radial pool of gold light — used sparingly behind the
        // hero and section headers. Not a decorative gradient wash.
        'glow-radial':
          'radial-gradient(60% 60% at 50% 0%, rgba(199,154,60,0.16) 0%, rgba(199,154,60,0) 70%)',
        'glow-radial-sm':
          'radial-gradient(50% 70% at 50% 50%, rgba(199,154,60,0.14) 0%, rgba(199,154,60,0) 72%)',
      },
      keyframes: {
        sweep: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
        // Scroll-reveal: the element is pre-hidden by .reveal in globals.css
        // and this plays once when it enters the viewport.
        'reveal-up': {
          '0%':   { opacity: '0', transform: 'translate3d(0, 18px, 0)' },
          '100%': { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'glow-pulse': {
          '0%, 100%': { opacity: '0.55' },
          '50%':      { opacity: '1' },
        },
        float: {
          '0%, 100%': { transform: 'translate3d(0, 0, 0)' },
          '50%':      { transform: 'translate3d(0, -6px, 0)' },
        },
      },
      animation: {
        sweep:        'sweep 1.8s linear infinite',
        'fade-in':    'fade-in 0.4s ease-in-out',
        'reveal-up':  'reveal-up 0.62s cubic-bezier(0.22, 1, 0.36, 1) both',
        'glow-pulse': 'glow-pulse 3.2s ease-in-out infinite',
        float:        'float 5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
}

export default config
