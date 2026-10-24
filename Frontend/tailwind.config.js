/** @type {import('tailwindcss').Config} */

/* Semantic tokens resolve through CSS custom properties, so a single class
   name adapts to the porcelain (light) and midnight-navy (dark) themes. */
const v = (name) => `rgb(var(--${name}) / <alpha-value>)`

/* Legacy zinc call sites are split per utility family on purpose:
   `bg-zinc-900` means "surface" while `text-zinc-900` means "ink". Mapping
   them from one shared ramp is what keeps 2.7k existing classes coherent. */
const bgZinc = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => [s, v(`b-${s}`)])
)
const textZinc = {
  50: 'rgb(252 252 253 / <alpha-value>)',
  100: 'rgb(246 247 250 / <alpha-value>)',
  200: 'rgb(231 234 240 / <alpha-value>)',
  300: 'rgb(212 216 226 / <alpha-value>)',
  ...Object.fromEntries([400, 500, 600, 700, 800, 900, 950].map((s) => [s, v(`t-${Math.min(s, 900)}`)])),
}
const borderZinc = Object.fromEntries(
  [50, 100, 200, 300, 400, 500, 600, 700, 800, 900, 950].map((s) => [s, v(`l-${s}`)])
)

const accent = {
  50: v('a-50'), 100: v('a-100'), 200: v('a-200'), 300: v('a-300'),
  400: v('a-400'), 500: v('a-500'), 600: v('a-600'),
  700: v('a-700'), 800: v('a-800'), 900: v('a-900'), 950: v('a-950'),
}

const status = (name) => ({
  DEFAULT: v(`${name}-500`),
  50: v(`${name}-50`), 100: v(`${name}-100`), 200: v(`${name}-200`),
  300: v(`${name}-300`), 400: v(`${name}-400`), 500: v(`${name}-500`),
  600: v(`${name}-600`), 700: v(`${name}-700`), 800: v(`${name}-800`), 900: v(`${name}-900`),
  bg: v(`${name}-soft`), text: v(`${name}-400`),
})

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Semantic surfaces (preferred in new code) ──────────
        canvas: { DEFAULT: v('canvas'), inset: v('canvas-inset') },
        surface: { DEFAULT: v('surface'), 2: v('surface-2'), 3: v('surface-3') },
        raised: v('raised'),
        hairline: { DEFAULT: v('hairline'), soft: v('hairline-soft'), strong: v('hairline-strong') },
        ink: { DEFAULT: v('ink'), muted: v('ink-muted'), subtle: v('ink-subtle'), faint: v('ink-faint') },
        fg: { DEFAULT: v('ink'), muted: v('ink-muted'), subtle: v('ink-subtle') },
        border: { DEFAULT: v('hairline'), muted: v('hairline-strong') },

        /* Short aliases so variants work on the names the pages actually use:
           `hover:bg-inset` and `placeholder:text-faint` cannot be generated for
           hand-written classes in index.css, only for theme colours. */
        inset: v('canvas-inset'),
        muted: v('ink-muted'),
        subtle: v('ink-subtle'),
        faint: v('ink-faint'),

        // ── Accents ────────────────────────────────────────────
        accent: {
          DEFAULT: v('accent'), hover: v('accent-hover'), active: v('accent-active'),
          soft: v('accent-soft'), on: v('accent-on'),
          ...accent,
        },
        ai: { DEFAULT: v('ai'), blue: v('ai-blue'), soft: v('ai-soft') },

        // ── Legacy ramps remapped onto the token system ────────
        blue: accent,
        indigo: accent,
        violet: { DEFAULT: v('ai'), 400: v('ai'), 500: v('ai'), 600: v('ai') },
        cyan: { DEFAULT: v('ai-blue'), dim: v('ai-blue'), 400: v('ai-blue'), 500: v('ai-blue') },
        success: status('success'),
        warning: status('warning'),
        danger: status('danger'),
        emerald: status('success'),
        green: status('success'),
        amber: status('warning'),
        yellow: status('warning'),
        red: status('danger'),
        rose: status('danger'),

        zinc: { ...bgZinc },
        slate: { ...bgZinc },

        // ── Anchored dark surface for hero / interview chrome ──
        navy: { DEFAULT: v('b-900'), deep: v('b-950'), line: v('b-700') },
        void: v('canvas'),
      },

      // Per-family overrides: text vs background vs border resolve differently
      textColor: { zinc: textZinc, slate: textZinc },
      backgroundColor: { zinc: bgZinc, slate: bgZinc },
      borderColor: { zinc: borderZinc, slate: borderZinc },
      divideColor: { zinc: borderZinc, slate: borderZinc },
      ringColor: { zinc: borderZinc, slate: borderZinc },
      outlineColor: { zinc: borderZinc, slate: borderZinc },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        display: ['"Instrument Sans"', 'Inter', 'system-ui', 'sans-serif'],
        body: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.6875rem', { lineHeight: '1rem' }],
        '3xs': ['0.625rem', { lineHeight: '0.875rem' }],
      },

      borderRadius: {
        sm: 'var(--r-sm)',
        DEFAULT: 'var(--r-sm)',
        md: 'var(--r-md)',
        lg: 'var(--r-lg)',
        xl: 'var(--r-xl)',
        '2xl': 'var(--r-2xl)',
        '3xl': 'var(--r-3xl)',
        '4xl': '2rem',
      },

      boxShadow: {
        DEFAULT: 'var(--sh-2)',
        none: 'none',
        '1': 'var(--sh-1)',
        '2': 'var(--sh-2)',
        '3': 'var(--sh-3)',
        '4': 'var(--sh-4)',
        sm: 'var(--sh-1)',
        md: 'var(--sh-2)',
        lg: 'var(--sh-3)',
        xl: 'var(--sh-4)',
        '2xl': 'var(--sh-4)',
        card: 'var(--sh-1)',
        'inset-border': 'inset 0 0 0 1px rgb(var(--hairline))',
        cyan: '0 0 0 1px rgb(var(--ai) / 0.25)',
      },

      transitionTimingFunction: {
        out: 'var(--ease-out)',
        soft: 'var(--ease-out-soft)',
        inOut: 'var(--ease-in-out)',
      },

      transitionDuration: {
        fast: 'var(--t-fast)',
        base: 'var(--t-base)',
        slow: 'var(--t-slow)',
      },

      maxWidth: {
        page: 'var(--page-max)',
        prose: 'var(--prose-max)',
      },

      spacing: {
        nav: 'var(--nav-h)',
      },

      animation: {
        'fade-in': 'fadeIn 0.3s var(--ease-out)',
        'slide-up': 'slideUp 0.3s var(--ease-out)',
        'wave': 'wave 1.2s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
        'pulse-ring': 'pulse-ring 2s var(--ease-out) infinite',
      },

      keyframes: {
        fadeIn: { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp: { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        wave: { '0%,100%': { transform: 'scaleY(0.4)' }, '50%': { transform: 'scaleY(1)' } },
      },
    },
  },
  plugins: [],
}
