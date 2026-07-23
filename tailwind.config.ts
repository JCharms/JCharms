import type { Config } from 'tailwindcss'

/**
 * J Charms design system.
 *
 * Every token the UI uses lives here so components pull from one source of
 * truth rather than ad-hoc hex values. Adjust hues here and the whole app moves
 * together. See src/styles/index.css for the running-stitch motif + font faces.
 */
const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      /**
       * Brand palette: blue & white only (client direction, 2026-07).
       * Depth comes from tonal range, not extra hues — deep navy for weight,
       * vivid azure for action, airy sky/ice tints for surfaces.
       * NOTE: token *names* (pink, marigold, sage, ivory) are legacy slots kept
       * to avoid a 600-usage rename; read the comment for each slot's role.
       */
      colors: {
        // Deep Navy — primary brand: headings, dark surfaces, footer.
        indigo: {
          DEFAULT: '#15357A',
          50: '#EDF2FB',
          100: '#D6E1F5',
          200: '#ACC3EA',
          300: '#7FA0DC',
          400: '#3F68B4',
          500: '#15357A',
          600: '#112C68',
          700: '#0D2251',
          800: '#09183A',
          900: '#050E23',
        },
        // Cool White — page background (legacy name "ivory").
        ivory: {
          DEFAULT: '#F7FAFD',
          50: '#FFFFFF',
          100: '#F7FAFD',
          200: '#EBF1F8',
          300: '#DBE5F0',
        },
        // Action Blue — primary CTA / accent (legacy name "pink").
        pink: {
          DEFAULT: '#2E6FE8',
          50: '#EFF4FE',
          100: '#DCE8FC',
          200: '#B9D1F9',
          300: '#8AB1F3',
          400: '#2E6FE8',
          500: '#1D5AD1',
          600: '#1747AC',
          700: '#123684',
        },
        // Sky Blue — secondary accent, badges (legacy name "marigold").
        marigold: {
          DEFAULT: '#3F97DD',
          50: '#EEF6FD',
          100: '#D9ECFA',
          200: '#A8D3F3',
          300: '#3F97DD',
          400: '#2A7EC2',
          500: '#1F639B',
        },
        // Ink — body text, now blue-slate so grays stay on-brand.
        ink: {
          DEFAULT: '#1B2A45',
          muted: '#4F648B',
          faint: '#8296B4',
        },
        // Steel Blue — success / confirmation states (legacy name "sage").
        sage: {
          DEFAULT: '#9FC0DF',
          50: '#F0F6FB',
          100: '#DEEBF6',
          200: '#9FC0DF',
          300: '#6B9CC8',
          400: '#43759F',
        },
      },
      fontFamily: {
        // Display: warm, rounded, slightly handcrafted — headings & product names.
        display: ['Fraunces', 'Georgia', 'serif'],
        // Body/UI chrome: clean, highly legible sans.
        sans: ['Inter', 'system-ui', 'sans-serif'],
        // Order numbers, prices, SKU-like labels — a little handmade price tag.
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        // Soft-goods brand — nothing sharp.
        sm: '0.375rem',
        DEFAULT: '0.625rem',
        md: '0.75rem',
        lg: '1rem',
        xl: '1.375rem',
        '2xl': '1.75rem',
        '3xl': '2.25rem',
        blob: '2rem 2.5rem 2rem 2.5rem',
      },
      boxShadow: {
        // Soft, cool lifts — like a physical object catching light.
        soft: '0 2px 8px -2px rgba(21, 53, 122, 0.08), 0 4px 16px -4px rgba(21, 53, 122, 0.06)',
        lift: '0 10px 30px -8px rgba(21, 53, 122, 0.16), 0 4px 12px -4px rgba(46, 111, 232, 0.10)',
        focus: '0 0 0 3px rgba(46, 111, 232, 0.45)',
      },
      keyframes: {
        // Page-load / scroll reveal: content stitches into place.
        stitchIn: {
          '0%': { opacity: '0', transform: 'translateY(12px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        // Running-stitch underline drawing itself in.
        stitchDraw: {
          '0%': { 'stroke-dashoffset': '24' },
          '100%': { 'stroke-dashoffset': '0' },
        },
        // Satisfying "pop" on Add to Cart.
        pop: {
          '0%': { transform: 'scale(1)' },
          '40%': { transform: 'scale(0.94)' },
          '70%': { transform: 'scale(1.06)' },
          '100%': { transform: 'scale(1)' },
        },
        floaty: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'stitch-in': 'stitchIn 0.55s cubic-bezier(0.22, 1, 0.36, 1) both',
        'stitch-draw': 'stitchDraw 0.6s ease-out both',
        pop: 'pop 0.35s ease-in-out',
        floaty: 'floaty 4s ease-in-out infinite',
      },
      backgroundImage: {
        // Dashed running-stitch line as a reusable border/underline treatment.
        'running-stitch':
          'repeating-linear-gradient(90deg, currentColor 0 8px, transparent 8px 16px)',
      },
    },
  },
  plugins: [],
}

export default config
