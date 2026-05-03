import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        /* Base Palette */
        blue: {
          50: 'var(--color-blue-50)',
          100: 'var(--color-blue-100)',
          200: 'var(--color-blue-200)',
          400: 'var(--color-blue-400)',
          600: 'var(--color-blue-600)',
          800: 'var(--color-blue-800)',
          900: 'var(--color-blue-900)',
        },
        teal: {
          50: 'var(--color-teal-50)',
          200: 'var(--color-teal-200)',
          400: 'var(--color-teal-400)',
          600: 'var(--color-teal-600)',
          900: 'var(--color-teal-900)',
        },
        neutral: {
          800: 'var(--color-neutral-800)',
          900: 'var(--color-neutral-900)',
          950: 'var(--color-neutral-950)',
        },
        /* Semantic Colors */
        primary: 'var(--color-primary)',
        secondary: 'var(--color-secondary)',
        accent: 'var(--color-accent)',
        danger: 'var(--color-danger)',
        warning: 'var(--color-warning)',
        success: 'var(--color-success)',
      },
      textColor: {
        primary: 'var(--color-text-primary)',
        secondary: 'var(--color-text-secondary)',
        muted: 'var(--color-text-muted)',
      },
      fontFamily: {
        heading: 'var(--font-heading)',
        body: 'var(--font-body)',
        mono: 'var(--font-mono)',
      },
      fontSize: {
        h1: ['var(--font-h1-size)', { lineHeight: 'var(--font-h1-line-height)', fontWeight: 'var(--font-h1-weight)', letterSpacing: 'var(--font-h1-letter-spacing)' }],
        h2: ['var(--font-h2-size)', { lineHeight: 'var(--font-h2-line-height)', fontWeight: 'var(--font-h2-weight)', letterSpacing: 'var(--font-h2-letter-spacing)' }],
        h3: ['var(--font-h3-size)', { lineHeight: 'var(--font-h3-line-height)', fontWeight: 'var(--font-h3-weight)', letterSpacing: 'var(--font-h3-letter-spacing)' }],
        'body-md': ['var(--font-body-md-size)', { lineHeight: 'var(--font-body-md-line-height)', fontWeight: 'var(--font-body-md-weight)' }],
        'body-sm': ['var(--font-body-sm-size)', { lineHeight: 'var(--font-body-sm-line-height)', fontWeight: 'var(--font-body-sm-weight)' }],
        label: ['var(--font-label-size)', { fontWeight: 'var(--font-label-weight)', letterSpacing: 'var(--font-label-letter-spacing)' }],
      },
      spacing: {
        1: 'var(--space-1)',
        2: 'var(--space-2)',
        3: 'var(--space-3)',
        4: 'var(--space-4)',
        5: 'var(--space-5)',
        6: 'var(--space-6)',
        8: 'var(--space-8)',
        10: 'var(--space-10)',
        12: 'var(--space-12)',
        16: 'var(--space-16)',
      },
      borderRadius: {
        sm: 'var(--radius-sm)',
        md: 'var(--radius-md)',
        lg: 'var(--radius-lg)',
        xl: 'var(--radius-xl)',
        full: 'var(--radius-full)',
      },
      boxShadow: {
        glass: 'var(--shadow-glass-light)',
        'glass-md': 'var(--shadow-glass-medium)',
        'glass-lg': 'var(--shadow-glass-strong)',
      },
      backdropBlur: {
        glass: 'var(--backdrop-blur)',
        'glass-mobile': 'var(--backdrop-blur-mobile)',
      },
      borderColor: {
        glass: 'var(--border-glass)',
      },
    },
  },
  plugins: [],
}
export default config
