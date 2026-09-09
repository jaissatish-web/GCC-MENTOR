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
        'gold-light': '#E3C77E',
        sand:       '#EDE3D2',
        marble:     '#FBF9F5',
        terracotta: '#A0562F',

        // The navy-era `ink` and `line` scales were deleted 2026-09-09: Meridian
        // defines both below, and nothing referenced the old sub-keys
        // (`ink-body`, `ink-warm`, `ink-faint`, `line-soft`) any more. Two
        // scales with one name is how `forest-dark` came to mean a light blue.
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

        // ── SECTION IDENTITY ─────────────────────────────────────────────────
        //
        // Nine hues, one per block of the Career Profile. Founder request
        // 2026-09-09: nine identical black headings made a long form hard to
        // navigate — "so user can feel easy to identify and read and fill".
        //
        // THIS IS A DELIBERATE EXCEPTION to Blueprint's one-accent rule, and it
        // only works because these colours mean exactly one thing: WHICH BLOCK
        // YOU ARE IN. They are never used for an action, a status or a value.
        // `signal` remains the only colour that means "do this", which is why
        // none of these sits near it in hue.
        //
        // Body text, field labels and values stay `graphite` — colouring what a
        // user reads and types would hurt the reading it is meant to help. Only
        // the block's own title and its step marker carry the hue.
        //
        // Muted and industrial on purpose: these are drawing-layer colours, not
        // sweets. Every one is >=4.5:1 on both white and paper, and the closest
        // pair is 30 apart in RGB and never adjacent in the list.
        //   status 6.36 · identity 6.11 · license 5.08 · summary 6.58
        //   experience 6.25 · education 5.35 · skills 6.34
        //   certifications 7.21 · additional 7.25      (all on paper)
        'sec-status': '#1F5A8A',
        'sec-identity': '#1D6360',
        'sec-license': '#5F6B24',
        'sec-summary': '#5B4A8A',
        'sec-experience': '#7A4E1F',
        'sec-education': '#2C6E49',
        'sec-skills': '#8A3A6B',
        'sec-certifications': '#8A3030',
        'sec-additional': '#4A4E5C',

        // ══ MERIDIAN ════════════════════════════════════════════════════════
        //
        // The current identity, founder decision 2026-09-09. It replaces
        // Blueprint, which replaced the navy palette. The brief was "neat and
        // clean premium, mobile optimised, and do not use the old design".
        //
        // WHY BLUEPRINT DID NOT READ AS PREMIUM, which is what this fixes.
        // Its ground was a cold grey-blue, every element carried a hairline
        // border, and its corners were 4px — so a card, an input and a button
        // all had the same silhouette and the whole screen read as one long
        // form. Meridian separates by SURFACE and SHADOW rather than by
        // border, and gives cards a 16px corner so they read as objects.
        //
        // TWO COLOURS DO TWO JOBS, and this is the rule that keeps it calm:
        //   `teal` is the brand and the voice — headers, dark panels, links,
        //     the colour of anything that says "this is us".
        //   `gold` is the ACTION, and only the action. One per screen.
        // Blueprint had a single `signal` doing both, which is why every
        // screen was orange. Splitting them is what lets a page be quiet
        // without being colourless.
        //
        // MEASURED BEFORE ANYTHING WAS DRAWN. The first `muted` was #6C7681 —
        // 4.32:1 on canvas, a fail, and it carries every timestamp and hint in
        // the product. That is the same defect class as `ink-400` and
        // `text-info` before it, so it is now measured first, always:
        //
        //   ink on canvas / white        16.69 / 17.84
        //   ink-soft on canvas / white    8.32 / 8.89
        //   muted on canvas / white       5.07 / 5.42   (was 4.32 — FAILED)
        //   muted on teal-soft            4.58
        //   teal on canvas / white        9.20 / 9.84
        //   white on teal                 9.84
        //   teal on teal-soft             8.30
        //   gold-ink on canvas / white    5.17 / 5.53
        //   ink on gold                   6.70
        //
        // `gold` is a FILL, never text: it is 2.66:1 on white. Text that needs
        // to be gold uses `gold-ink`. That is the same trap `signal` on
        // `signal-tint` was, written down so it cannot be walked into again.
        canvas: '#FAF7F2',
        ink: {
          DEFAULT: '#14181C',
          soft: '#414B55',
          muted: '#616B76',
        },
        teal: {
          DEFAULT: '#0F4C43',
          bright: '#12695C',
          soft: '#E4EEEB',
        },
        gold: {
          DEFAULT: '#C9962E',
          ink: '#8A6114',
          soft: '#F7EFDD',
        },
        line: {
          DEFAULT: '#EAE4DB',
          strong: '#D2C9BC',
        },
        /**
         * Status, and deliberately NOT the brand.
         *
         * `teal` says "this is us" and `gold` says "do this". Neither may also
         * mean "this went well" or "this needs attention" — the moment a brand
         * colour carries a status, a page cannot say both things at once.
         *   white on ok      6.12      ok on ok-soft      5.18
         *   white on alert   6.78      alert on alert-soft 5.62
         */
        ok: {
          DEFAULT: '#2C6E49',
          soft: '#E3EFE8',
        },
        alert: {
          DEFAULT: '#A33528',
          soft: '#F8E6E2',
        },

        // ── BLUEPRINT ────────────────────────────────────────────────────────
        //
        // The new visual identity, chosen by the founder 2026-09-08 from three
        // mocked directions. The brief it answers: the product should look like
        // an instrument, not a brochure. Its users are piping, E&I and
        // commissioning engineers who read technical drawings all day, so the
        // language is drawn from that — a tight grid, mono figures, sharp
        // corners, and ONE signal colour that means "act".
        //
        // ADDITIVE AND ISOLATED on purpose. The navy palette below stays live
        // and untouched, so this rolls out one screen at a time and reverts in
        // one commit if it is wrong. Names are collision-free and permanent, so
        // nothing needs renaming if it stays.
        //
        // EVERY VALUE WAS CONTRAST-CHECKED BEFORE IT WAS WRITTEN — the previous
        // palette shipped white-on-white and 1.69:1 text because it was not:
        //   graphite on paper   16.07     slate on paper    4.82
        //   graphite on surface 18.37     slate on surface  5.51
        //   signal on surface    5.18     white on signal   5.18
        //   edge-strong on paper 3.40     on surface        3.88
        // `edge` is a decorative hairline and is deliberately below 3:1 — it
        // never carries meaning. `edge-strong` is for input borders, which do.
        //
        // ONE TRAP, measured: `signal` ON `signal-tint` is 4.41:1 and FAILS.
        // Text on a tinted signal fill must use `signal-ink` (6.22:1). The
        // tint is a background, never a text colour pairing with its own hue.
        paper: '#EEF0F1',
        graphite: '#101519',
        /**
         * Body text. `graphite` is a heading weight and too heavy for a
         * paragraph; `slate` is a muted weight and too light for one.
         * 8.43:1 on paper, 9.64:1 on white.
         */
        'graphite-soft': '#3B4650',
        slate: '#5B6B76',
        signal: '#C2410C',
        'signal-tint': '#FCE9E1',
        'signal-ink': '#9A3412',
        edge: '#D8DDE0',
        'edge-strong': '#76838E',

        // ── GULF WARMTH ──────────────────────────────────────────────────────
        //
        // Founder decision 2026-09-09, "Option A": the redesign brief asked for
        // a warm desert palette — navy, sand, ivory. Blueprint had already been
        // chosen and shipped across 66 files the day before. Repainting the
        // whole app a second time would have bought warmth at the price of
        // another week and another round of contrast defects, so instead the
        // brief's two useful colours join Blueprint as SURFACES.
        //
        // THEY ARE SURFACES, NOT ACTIONS. `signal` remains the only colour in
        // this product that means "do this". A sand panel or a navy header can
        // hold a button; it can never BE one. The moment navy is used for a CTA
        // there are two action colours and neither reads as one.
        //
        // MEASURED BEFORE THEY WERE WRITTEN, and two pairs failed:
        //
        //   graphite on bp-sand        14.14   pass
        //   graphite-soft on bp-sand    7.42   pass
        //   slate on bp-sand            4.24   FAIL — use graphite-soft on sand
        //   signal on bp-sand           3.99   FAIL — use signal-ink on sand
        //   signal-ink on bp-sand       5.62   pass
        //   edge-strong on bp-sand      2.99   FAIL — no inputs on sand
        //   white on bp-navy           13.17   pass
        //   bp-navy on paper / white   11.52 / 13.17
        //   bp-navy on bp-navy-tint    10.86   pass
        //   slate on bp-navy-tint       4.55   pass
        //
        // So there are three standing rules on a sand surface: secondary text is
        // `graphite-soft` and never `slate`; accent text is `signal-ink` and
        // never `signal`; and no form control sits on it, because its border
        // cannot reach 3:1.
        //
        // `bp-sand` is 1.14 against `paper` and 1.30 against white — the same
        // near-invisible value step `paper` already has against white. That is
        // deliberate: it separates by HUE, not by weight, so a sand band warms
        // a screen without carving it into more boxes.
        'bp-sand': '#E8E1D5',
        /** Hairline on sand. Decorative only, deliberately below 3:1 — like `edge`. */
        'bp-sand-line': '#D6CCBA',
        /** Dark chrome: page headers, stage bars, the footer. Never a button. */
        'bp-navy': '#12324F',
        'bp-navy-tint': '#E3EAF2',
        /** Text weight navy, for use on `bp-navy-tint`. */
        'bp-navy-ink': '#0C2338',

        // ── THE NAVY PALETTE ─────────────────────────────────────────────────
        //
        // These colours were once named `forest*`. The palette moved from green
        // to navy (TASK-112) by changing the VALUES and keeping the green
        // NAMES, so `forest` was navy and `forest-dark` was a LIGHT BLUE —
        // despite "dark" — because it existed to sit ON a dark surface.
        //
        // Choosing a colour by its name therefore produced a wrong result, and
        // it shipped two real defects: near-black text on a navy button
        // (1.69:1, invisible) and white labels on a white card.
        //
        // Honest aliases were added first, pointing at identical values, with
        // the old names left valid so no page had to be rewritten immediately.
        // That was the right first move and the wrong place to stop: while both
        // names resolved, the trap was still fully armed and the app still used
        // the misleading name in 291 places.
        //
        // RENAMED AND THE ALIASES DELETED 2026-09-08, in one pass across 50
        // files, verified by comparing every colour declaration in the compiled
        // stylesheet before and after — identical. There is now exactly one
        // name per colour, and it is the true one.
        navy: '#1B4272',
        'navy-deep': '#0B1F38',
        'navy-tint': '#E7EEF8',
        'navy-tint-dark': '#14304F',
        /** Light blue for text and borders ON dark navy surfaces. */
        sky: '#6BA3E0',
        /**
         * Darker than `navy-deep`. The ground for dark chrome — the sidebar and
         * the mobile navigation bar. Added 2026-09-08 during the `forest*`
         * rename: it was the one deprecated token with no honest name to move
         * to, and `bg-dark` (the same value) reads as a page background rather
         * than as a navy.
         */
        'navy-deepest': '#081627',
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
        /**
         * Muted / secondary text.
         *
         * DARKENED 2026-09-08 from #6B7A8D, which failed WCAG AA on every
         * surface it was used on — measured, not estimated:
         *
         *   on surface-light (white cards)   4.38:1   fail
         *   on bg (the page ground)          4.15:1   fail
         *   on surface-2-light (insets)      3.86:1   fail
         *
         * It carries helper text, timestamps, field hints and secondary labels
         * across 314 call sites — body-sized text, which has to meet 4.5:1.
         * This value is the same hue at 89% lightness, so the design intent is
         * unchanged and nothing needed rewriting:
         *
         *   on surface-light                 5.29:1   pass
         *   on bg                            5.02:1   pass
         *   on surface-2-light               4.67:1   pass
         *
         * It matters most for exactly this product's users: older eyes, and
         * phone screens read outdoors on a Gulf site.
         */
        'ink-400': '#5F6D7D',
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
        // Blueprint display face — a grotesque with enough weight to hold a
        // heading without a serif's warmth. Paired with Inter for body and
        // IBM Plex Mono for every figure.
        'bp-display': ['var(--font-archivo)', 'var(--font-inter)', 'system-ui', 'sans-serif'],
        // Meridian's display face. Headings only — never body, never a value.
        'display': ['var(--font-fraunces)', 'Georgia', 'serif'],
        mono:  ['var(--font-plex-mono)', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Existing lg/xl/2xl/3xl values are retained for current call sites.
        // The redesign scale is additive under explicit radius-* names.
        // Blueprint: drawn, not rounded. A technical drawing has corners.
        'bp': '4px',
        'bp-lg': '6px',
        // Meridian. A card is an object (16px); a control you press is tighter
        // (11px). Blueprint gave both 4px, which is why a card and an input
        // were indistinguishable at a glance.
        'ctl': '11px',
        'card': '16px',
        'card-lg': '20px',
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
        // Meridian elevation. Deliberately shallow — two very soft layers, so
        // a card lifts off the canvas without announcing itself. Anything
        // heavier starts to look like a 2015 material card.
        'm-1': '0 1px 2px rgba(20,24,28,0.05)',
        'm-2': '0 1px 2px rgba(20,24,28,0.05), 0 6px 18px -8px rgba(20,24,28,0.10)',
        'm-3': '0 2px 4px rgba(20,24,28,0.06), 0 18px 40px -14px rgba(20,24,28,0.18)',
        'm-drawer': '-14px 0 34px -12px rgba(20,24,28,0.40)',
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
