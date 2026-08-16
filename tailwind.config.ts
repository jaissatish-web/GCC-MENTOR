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
        void: '#060F1D',
        surface: '#0F2542',
        'surface-2': '#16304F',
        'surface-3': '#1E3A5C',
        hairline: '#1E3A5C',

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

        // ── Redesign token foundation (docs/redesign/DESIGN_SYSTEM.md §1) ──
        // Existing tokens above are retained for current call sites. The
        // redesign palette is additive; explicit *-dark aliases expose the
        // approved dark-theme values without silently changing legacy colors.
        forest: '#1B4272',
        'forest-dark': '#6BA3E0',
        'forest-deep': '#0B1F38',
        'forest-deep-dark': '#081627',
        'forest-tint': '#E7EEF8',
        'forest-tint-dark': '#14304F',

        // ── TRUTHFUL NAMES FOR THE SAME COLOURS ──────────────────────────────
        //
        // The palette moved from green to navy (TASK-112) by changing the
        // VALUES and keeping the green NAMES. `forest` is navy. `forest-dark`
        // is a LIGHT BLUE — despite "dark" — because it exists to sit ON a dark
        // surface. Anyone choosing a colour by its name chooses wrong, and that
        // has already shipped two real defects: near-black text on a navy
        // button (1.69:1, invisible) and white labels on a white card.
        //
        // These aliases point at the identical values, so nothing renders
        // differently today. New code uses the honest name; the old names stay
        // valid, so no page has to be rewritten to benefit. A mass rename would
        // touch every file in the app for zero visual change — the risk belongs
        // to a dedicated pass, not to every ticket that needs a blue.
        //
        // USE THESE. Treat `forest*` as deprecated.
        navy: '#1B4272',
        'navy-deep': '#0B1F38',
        'navy-tint': '#E7EEF8',
        'navy-tint-dark': '#14304F',
        /** Light blue for text and borders ON dark navy surfaces. */
        sky: '#6BA3E0',
        // Collision-safe redesign names: the existing `gold` token above is
        // retained for current pages; redesign tickets use these exact §1.1
        // CTA/accent and tint values.
        'redesign-gold': '#C98A2E',
        'redesign-gold-dark': '#E8B15C',
        'redesign-gold-tint': '#FBF1DF',
        'redesign-gold-tint-dark': '#26301F',
        'gold-text': '#8A5A1E',
        'gold-text-dark': '#F3CD8B',
        amber: '#B9691D',
        'amber-dark': '#E2933E',
        terra: '#B4472B',
        'terra-dark': '#E27A54',
        'terra-tint': '#F7E7E1',
        'terra-tint-dark': '#3A2018',
        'ink-900': '#111C2B',
        'ink-900-dark': '#F3F6FA',
        'ink-700': '#44546A',
        'ink-700-dark': '#C4D0DE',
        'ink-400': '#6B7A8D',
        'ink-400-dark': '#93A7BD',
        'ink-200': '#DDE3EC',
        'ink-200-dark': '#2A4468',
        bg: '#F7F9FC',
        'bg-dark': '#081627',
        'surface-light': '#FFFFFF',
        'surface-dark': '#0F2542',
        'surface-2-light': '#EDF1F7',
        'surface-2-dark': '#16304F',
        'line-light': '#DCE3EC',
        'line-light-strong': '#C2CCD9',
        'line-dark': '#1E3A5C',
        'line-dark-strong': '#2C5482',
      },
      spacing: {
        // The redesign's explicit 8px rhythm. These values match Tailwind's
        // existing scale where present and add the documented 20px step.
        '1': '4px',
        '2': '8px',
        '3': '12px',
        '4': '16px',
        '5': '20px',
        '6': '24px',
        '8': '32px',
        '10': '40px',
        '12': '48px',
        '16': '64px',
      },
      fontFamily: {
        serif: ['var(--font-instrument-serif)', 'Georgia', 'serif'],
        sans:  ['var(--font-jakarta)', 'system-ui', 'sans-serif'],
        // Redesign-only, opt-in stack (docs/redesign/DESIGN_SYSTEM.md §2) —
        // collision-safe alongside `sans`, mirroring the `redesign-gold`
        // naming pattern. Existing pages keep resolving through `sans`
        // (Jakarta) unchanged until their own page-level ticket migrates
        // them to `font-redesign-sans`.
        'redesign-sans': ['var(--font-inter)', 'var(--font-jakarta)', 'system-ui', 'sans-serif'],
        mono:  ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Existing lg/xl/2xl/3xl values are retained for current call sites.
        // The redesign scale is additive under explicit radius-* names.
        'radius-sm': '6px',
        'radius-md': '12px',
        'radius-lg': '16px',
        'radius-xl': '20px',
        'radius-full': '9999px',
        lg: '12px',
        xl: '14px',
        '2xl': '18px',
        '3xl': '22px',
      },
      // Elevation + glow. On a dark base, depth comes from glow and layered
      // shadow rather than the soft grey shadows a light theme uses.
      boxShadow: {
        // Redesign §5 scale. Existing elev/glow names remain below for
        // current call sites and are intentionally not changed.
        'redesign-sm': '0 1px 2px rgba(23,36,31,0.07)',
        'redesign-md': '0 6px 16px rgba(23,36,31,0.09)',
        'redesign-lg': '0 20px 44px rgba(23,36,31,0.14)',
        'redesign-cta-glow': '0 6px 18px rgba(201,138,46,0.35)',
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
