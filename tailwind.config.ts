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
      colors: {
        // Deep Indigo — primary brand, from the logo.
        indigo: {
          DEFAULT: '#1B1B4E',
          50: '#EDEDF5',
          100: '#D2D2E6',
          200: '#A5A5CD',
          300: '#7878B4',
          400: '#4B4B83',
          500: '#1B1B4E',
          600: '#181845',
          700: '#131338',
          800: '#0E0E2A',
          900: '#08081A',
        },
        // Warm Ivory — page background.
        ivory: {
          DEFAULT: '#FDFAF4',
          50: '#FFFFFF',
          100: '#FDFAF4',
          200: '#F6EFE1',
          300: '#EEE3CD',
        },
        // Yarn Pink — primary playful accent (buttons, highlights).
        pink: {
          DEFAULT: '#F2618B',
          50: '#FEF0F4',
          100: '#FCDBE5',
          200: '#F9B8CC',
          300: '#F693B0',
          400: '#F2618B',
          500: '#E93F72',
          600: '#D02259',
          700: '#A11945',
        },
        // Marigold — secondary accent (badges, small details).
        marigold: {
          DEFAULT: '#F0A93B',
          50: '#FEF6E9',
          100: '#FCE8C6',
          200: '#F8D08A',
          300: '#F0A93B',
          400: '#DE9420',
          500: '#B87716',
        },
        // Ink — body text.
        ink: {
          DEFAULT: '#22223B',
          muted: '#565676',
          faint: '#8A8AA3',
        },
        // Sage — success / confirmation states, used sparingly.
        sage: {
          DEFAULT: '#A9C9A4',
          50: '#F0F6EF',
          100: '#DCEBDA',
          200: '#A9C9A4',
          300: '#7FA978',
          400: '#5C8654',
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
        // Soft, warm lifts — like a physical object catching light.
        soft: '0 2px 8px -2px rgba(34, 34, 59, 0.08), 0 4px 16px -4px rgba(34, 34, 59, 0.06)',
        lift: '0 10px 30px -8px rgba(34, 34, 59, 0.16), 0 4px 12px -4px rgba(242, 97, 139, 0.10)',
        focus: '0 0 0 3px rgba(242, 97, 139, 0.45)',
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
