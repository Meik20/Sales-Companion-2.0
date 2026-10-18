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
        success: 'var(--color-success)',
        destructive: 'var(--destructive)',
        /* Charts */
        'chart-1': 'var(--chart-1)',
        'chart-2': 'var(--chart-2)',
        'chart-3': 'var(--chart-3)',
        'chart-4': 'var(--chart-4)',
        'chart-5': 'var(--chart-5)',
        /* Sidebar */
        sidebar: {
          DEFAULT: 'var(--sidebar)',
          foreground: 'var(--sidebar-foreground)',
          primary: {
            DEFAULT: 'var(--sidebar-primary)',
            foreground: 'var(--sidebar-primary-foreground)'
          },
          accent: {
            DEFAULT: 'var(--sidebar-accent)',
            foreground: 'var(--sidebar-accent-foreground)'
          },
          border: 'var(--sidebar-border)',
          ring: 'var(--sidebar-ring)'
        }
      },
      fontFamily: {
        heading: ['var(--font-outfit)', 'var(--font-heading)', 'sans-serif'],
        sans: ['var(--font-inter)', 'var(--font-body)', 'sans-serif'],
        body: ['var(--font-inter)', 'var(--font-body)', 'sans-serif'],
        mono: 'var(--font-mono)'
      },
      fontSize: {
        '2xs': ['var(--font-size-2xs, 0.6875rem)', { lineHeight: 'var(--line-height-normal, 1.5)' }],
        xs: ['var(--font-size-xs, 0.75rem)', { lineHeight: 'var(--line-height-normal, 1.5)' }],
        sm: ['var(--font-size-sm, 0.8125rem)', { lineHeight: 'var(--line-height-normal, 1.5)' }],
        base: ['var(--font-size-base, 0.875rem)', { lineHeight: 'var(--line-height-normal, 1.5)' }],
        md: ['var(--font-size-md, 0.9375rem)', { lineHeight: 'var(--line-height-normal, 1.5)' }],
        lg: ['var(--font-size-lg, 1rem)', { lineHeight: 'var(--line-height-normal, 1.5)' }],
        xl: ['var(--font-size-xl, 1.125rem)', { lineHeight: 'var(--line-height-snug, 1.375)' }],
        '2xl': ['var(--font-size-2xl, 1.25rem)', { lineHeight: 'var(--line-height-snug, 1.375)' }],
        '3xl': ['var(--font-size-3xl, 1.5rem)', { lineHeight: 'var(--line-height-tight, 1.2)' }],
        '4xl': ['var(--font-size-4xl, 1.875rem)', { lineHeight: 'var(--line-height-tight, 1.2)' }],
        '5xl': ['var(--font-size-5xl, 2.25rem)', { lineHeight: 'var(--line-height-tight, 1.2)' }]
      },
      boxShadow: {
        'elevation-0': 'var(--shadow-elevation-0)',
        'elevation-1': 'var(--shadow-elevation-1)',
        'elevation-2': 'var(--shadow-elevation-2)',
        'elevation-3': 'var(--shadow-elevation-3)',
        'elevation-4': 'var(--shadow-elevation-4)',
        'elevation-5': 'var(--shadow-elevation-5)',
        'hover-lift': 'var(--shadow-hover-lift)',
        'glow-primary': 'var(--glow-primary)',
        'glow-primary-strong': 'var(--glow-primary-strong)',
        'glow-accent': 'var(--glow-accent)',
        'glow-accent-strong': 'var(--glow-accent-strong)',
        'ring-focus': 'var(--ring-focus)',
        'inset-subtle': 'var(--shadow-inset)',
        'inset-focus': 'var(--shadow-inset-focus)'
      },
      borderRadius: {
        '2xs': 'var(--radius-2xs, 2px)',
        xs: 'var(--radius-xs, 4px)',
        sm: 'var(--radius-sm, 6px)',
        md: 'var(--radius-md, 8px)',
        lg: 'var(--radius-lg, 12px)',
        xl: 'var(--radius-xl, 16px)',
        '2xl': 'var(--radius-2xl, 20px)',
        '3xl': 'var(--radius-3xl, 24px)',
        full: 'var(--radius-full, 9999px)'
      },
      transitionTimingFunction: {
        standard: 'cubic-bezier(0.2, 0, 0, 1)',
        emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
        decelerate: 'cubic-bezier(0, 0, 0, 1)',
        accelerate: 'cubic-bezier(0.3, 0, 1, 1)',
        spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        smooth: 'cubic-bezier(0.4, 0, 0.2, 1)'
      },
      transitionDuration: {
        instant: '80ms',
        fast: '150ms',
        normal: '250ms',
        moderate: '350ms',
        slow: '500ms',
        deliberate: '700ms'
      },
      animation: {
        'scale-in': 'scaleIn 200ms cubic-bezier(0.2, 0, 0, 1)',
        'slide-up': 'slideInFromBottom 250ms cubic-bezier(0.2, 0, 0, 1)',
        'slide-down': 'slideInFromTop 250ms cubic-bezier(0.2, 0, 0, 1)',
        shimmer: 'shimmer 1.5s ease-in-out infinite',
        'glow-pulse': 'glowPulse 2s ease-in-out infinite',
        'bounce-in': 'bounceIn 300ms cubic-bezier(0.34, 1.56, 0.64, 1)',
        'status-pulse': 'statusPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' }
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        slideInFromBottom: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        slideInFromTop: {
          '0%': { opacity: '0', transform: 'translateY(-8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        },
        bounceIn: {
          '0%': { opacity: '0', transform: 'scale(0.8)' },
          '70%': { transform: 'scale(1.05)' },
          '100%': { opacity: '1', transform: 'scale(1)' }
        },
        glowPulse: {
          '0%, 100%': { boxShadow: '0 0 15px rgba(255, 166, 17, 0.2)' },
          '50%': { boxShadow: '0 0 25px rgba(255, 166, 17, 0.5)' }
        },
        statusPulse: {
          '0%, 100%': { opacity: '1', transform: 'scale(1)' },
          '50%': { opacity: '0.4', transform: 'scale(0.92)' }
        }
      }
    }
  },
  plugins: []
}
export default config
