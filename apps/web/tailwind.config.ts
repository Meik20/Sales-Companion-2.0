import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/features/**/*.{js,ts,jsx,tsx,mdx}'
  ],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        card: {
          DEFAULT: 'var(--card)',
          foreground: 'var(--card-foreground)'
        },
        popover: {
          DEFAULT: 'var(--popover)',
          foreground: 'var(--popover-foreground)'
        },
        primary: {
          DEFAULT: 'var(--primary)',
          foreground: 'var(--primary-foreground)'
        },
        secondary: {
          DEFAULT: 'var(--secondary)',
          foreground: 'var(--secondary-foreground)'
        },
        muted: {
          DEFAULT: 'var(--muted)',
          foreground: 'var(--muted-foreground)'
        },
        accent: {
          DEFAULT: 'var(--accent)',
          foreground: 'var(--accent-foreground)'
        },
        border: 'var(--border)',
        input: 'var(--input)',
        ring: 'var(--ring)',

        /* Base Palette */
        blue: {
          50: 'var(--color-blue-50)',
          100: 'var(--color-blue-100)',
          200: 'var(--color-blue-200)',
          400: 'var(--color-blue-400)',
          600: 'var(--color-blue-600)',
          800: 'var(--color-blue-800)',
          900: 'var(--color-blue-900)'
        },
        teal: {
          50: 'var(--color-teal-50)',
          200: 'var(--color-teal-200)',
          400: 'var(--color-teal-400)',
          600: 'var(--color-teal-600)',
          900: 'var(--color-teal-900)'
        },
        neutral: {
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
          950: 'var(--color-neutral-950)'
        },
        /* Semantic Colors */
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)'
      },
      fontFamily: {
        heading: ['var(--font-outfit)', 'var(--font-heading)', 'sans-serif'],
        sans: ['var(--font-inter)', 'var(--font-body)', 'sans-serif'],
        body: ['var(--font-inter)', 'var(--font-body)', 'sans-serif'],
        mono: 'var(--font-mono)'
      }
    }
  },
  plugins: []
}
export default config
