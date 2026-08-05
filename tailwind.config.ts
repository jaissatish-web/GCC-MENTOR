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
      keyframes: {
        sweep: {
          '0%':   { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(220%)' },
        },
        'fade-in': {
          '0%':   { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
      animation: {
        sweep:     'sweep 1.8s linear infinite',
        'fade-in': 'fade-in 0.4s ease-in-out',
      },
    },
  },
  plugins: [],
}

export default config
