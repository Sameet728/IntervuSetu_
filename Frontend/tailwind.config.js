/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Background layers (dark) ──────────────────────────
        bg:      { DEFAULT: '#09090b', subtle: '#111113', muted: '#18181b' },
        surface: '#18181b',
        card:    '#1c1c1f',
        border:  { DEFAULT: '#27272a', muted: '#3f3f46' },

        // ── Text ─────────────────────────────────────────────
        fg:      { DEFAULT: '#fafafa', muted: '#a1a1aa', subtle: '#71717a' },

        // ── Accent: clean blue (not neon) ─────────────────────
        blue:    {
          50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe',
          300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6',
          600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a',
        },

        // ── Status ───────────────────────────────────────────
        success: { DEFAULT: '#16a34a', bg: '#052e16', text: '#4ade80' },
        warning: { DEFAULT: '#ca8a04', bg: '#1c1400', text: '#fbbf24' },
        danger:  { DEFAULT: '#dc2626', bg: '#2d0000', text: '#f87171' },

        // ── Zinc scale (primary neutrals) ────────────────────
        zinc: {
          50:  '#fafafa', 100: '#f4f4f5', 200: '#e4e4e7',
          300: '#d4d4d8', 400: '#a1a1aa', 500: '#71717a',
          600: '#52525b', 700: '#3f3f46', 800: '#27272a',
          900: '#18181b', 950: '#09090b',
        },

        // ── Keep legacy ────────────────────────────────────────
        void:    '#09090b',
        cyan:    { DEFAULT: '#06b6d4', dim: '#0891b2' },
        violet:  { DEFAULT: '#7c3aed' },
        emerald: { DEFAULT: '#16a34a' },
        amber:   { DEFAULT: '#ca8a04' },
        rose:    { DEFAULT: '#dc2626' },
      },

      fontFamily: {
        sans:    ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        display: ['Poppins', 'Inter', 'system-ui', 'sans-serif'],
        body:    ['Inter', 'system-ui', 'sans-serif'],
        mono:    ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
      },

      fontSize: {
        '2xs': ['0.65rem', { lineHeight: '1rem' }],
      },

      borderRadius: {
        '4xl': '2rem',
      },

      boxShadow: {
        'sm-dark': '0 1px 3px rgba(0,0,0,0.5)',
        'md-dark': '0 4px 12px rgba(0,0,0,0.4)',
        'lg-dark': '0 8px 32px rgba(0,0,0,0.5)',
        'inset-border': 'inset 0 0 0 1px rgba(255,255,255,0.06)',
        // legacy
        card: '0 2px 8px rgba(0,0,0,0.3)',
        cyan: '0 0 20px rgba(6,182,212,0.15)',
      },

      animation: {
        'fade-in':   'fadeIn 0.3s ease',
        'slide-up':  'slideUp 0.3s ease',
        'wave':      'wave 1.2s ease-in-out infinite',
        'spin-slow': 'spin 2s linear infinite',
      },

      keyframes: {
        fadeIn:   { from: { opacity: 0 }, to: { opacity: 1 } },
        slideUp:  { from: { opacity: 0, transform: 'translateY(6px)' }, to: { opacity: 1, transform: 'translateY(0)' } },
        wave:     { '0%,100%': { transform: 'scaleY(0.4)' }, '50%': { transform: 'scaleY(1)' } },
      },
    },
  },
  plugins: [],
}
