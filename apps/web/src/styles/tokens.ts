// ─── Design Tokens — Sales Companion 2.0 ───────────────────────────────────────
// Toutes les valeurs pointent vers les CSS Variables du theme.css & firebase-theme.css
// → modifier une couleur dans theme.css suffit à changer tout le projet.

// ─────────────────────────────────────────────────────────────────────────────
// Références directes aux CSS Variables (utilisables dans les inline styles React)
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  bg: 'var(--bg)',
  bg2: 'var(--bg2)',
  bg3: 'var(--bg3)',
  bg4: 'var(--bg4)',
  surface: 'var(--bg2)',

  // ── Texte ─────────────────────────────────────────────────────────────────
  text: 'var(--tx)',
  textMid: 'var(--tx2)',
  textDim: 'var(--tx3)',
  textTitle: 'var(--tx)',
  link: 'var(--cr-link-color)',

  // ── Deep Blue Tech Primary (ancien colors.green pour compatibilité) ─────────
  green: 'var(--color-primary)', // #185FA5
  greenMid: 'var(--color-blue-600)', // #185FA5
  greenDark: 'var(--color-blue-900)', // #042C53
  greenLight: 'var(--color-blue-50)', // #E6F1FB

  // ── Accent Cyan ───────────────────────────────────────────────────────────
  accent: 'var(--color-accent)',
  accentLight: 'var(--color-blue-200)',

  // ── Teal / Secondaire ─────────────────────────────────────────────────────
  gold: 'var(--color-secondary)',
  goldDark: 'var(--color-teal-900)',
  goldLight: 'var(--color-teal-50)',

  // ── Bordures ──────────────────────────────────────────────────────────────
  border: 'var(--bd)',
  border2: 'var(--bd2)',
  border_compat: 'var(--bd)',

  // ── États sémantiques ─────────────────────────────────────────────
  success: 'var(--color-success)',
  successBg: 'var(--color-success-bg)',
  successBorder: 'rgba(37, 99, 235, 0.3)',

  warning: 'var(--color-warning)',
  warningBg: 'var(--color-warning-bg)',
  warningBorder: 'rgba(145, 89, 7, 0.3)',

  danger: 'var(--color-danger)',
  dangerBg: 'var(--color-danger-bg)',
  dangerBorder: 'rgba(204, 16, 22, 0.3)',

  info: 'var(--color-accent)',
  infoBg: 'var(--color-primary-light)',
  infoBorder: 'var(--color-blue-200)',

  // ── Interactifs ───────────────────────────────────────────────────
  hoverBg: 'var(--cr-hover-background-color)',
  activeBg: 'var(--cr-active-background-color)'
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Ombres — Système d'élévation World-Class & Glass effect
// ─────────────────────────────────────────────────────────────────────────────

export const shadows = {
  // Rétrocompatibilité Glass
  sm: 'var(--shadow-glass-light)',
  md: 'var(--shadow-glass-medium)',
  lg: 'var(--shadow-glass-strong)',
  xl: 'var(--shadow-glass-strong)',
  glow: '0 0 30px rgba(24, 95, 165, 0.25)',

  // Échelle d'élévation hiérarchique
  elevation0: 'var(--shadow-elevation-0)',
  elevation1: 'var(--shadow-elevation-1)',
  elevation2: 'var(--shadow-elevation-2)',
  elevation3: 'var(--shadow-elevation-3)',
  elevation4: 'var(--shadow-elevation-4)',
  elevation5: 'var(--shadow-elevation-5)',

  // Interactions & focus
  hoverLift: 'var(--shadow-hover-lift)',
  ringFocus: 'var(--ring-focus)',
  inset: 'var(--shadow-inset)',
  insetFocus: 'var(--shadow-inset-focus)'
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Glows & Halos lumineux
// ─────────────────────────────────────────────────────────────────────────────

export const glow = {
  primary: 'var(--glow-primary)',
  primaryStrong: 'var(--glow-primary-strong)',
  accent: 'var(--glow-accent)',
  accentStrong: 'var(--glow-accent-strong)'
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Rayons
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  sm: 'var(--r)',
  md: 'var(--r2)',
  lg: 'var(--r3)',
  xl: 'var(--r3)',
  pill: '9999px',

  // Harmoniques complètes
  r2xs: 'var(--radius-2xs)',
  rxs: 'var(--radius-xs)',
  rsm: 'var(--radius-sm)',
  rmd: 'var(--radius-md)',
  rlg: 'var(--radius-lg)',
  rxl: 'var(--radius-xl)',
  r2xl: 'var(--radius-2xl)',
  r3xl: 'var(--radius-3xl)',
  rfull: 'var(--radius-full)'
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Espacement
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,

  scale: {
    1: 'var(--space-1)',
    2: 'var(--space-2)',
    3: 'var(--space-3)',
    4: 'var(--space-4)',
    5: 'var(--space-5)',
    6: 'var(--space-6)',
    8: 'var(--space-8)',
    10: 'var(--space-10)',
    12: 'var(--space-12)',
    16: 'var(--space-16)'
  }
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Transitions & Animations
// ─────────────────────────────────────────────────────────────────────────────

export const transitions = {
  fast: '150ms ease',
  normal: '300ms ease',

  duration: {
    instant: 'var(--duration-instant)',
    fast: 'var(--duration-fast)',
    normal: 'var(--duration-normal)',
    moderate: 'var(--duration-moderate)',
    slow: 'var(--duration-slow)',
    deliberate: 'var(--duration-deliberate)'
  },

  easing: {
    standard: 'var(--ease-standard)',
    emphasized: 'var(--ease-emphasized)',
    decelerate: 'var(--ease-decelerate)',
    accelerate: 'var(--ease-accelerate)',
    spring: 'var(--ease-spring)',
    smooth: 'var(--ease-smooth)'
  },

  css: {
    interactive: 'var(--transition-interactive)',
    surface: 'var(--transition-surface)',
    fade: 'var(--transition-fade)',
    spring: 'var(--transition-spring)'
  }
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Typographie & Échelle
// ─────────────────────────────────────────────────────────────────────────────

export const fonts = {
  sans: 'var(--font-family)',
  display: 'var(--font-family)',
  heading: 'var(--font-outfit), var(--font-heading), sans-serif',
  body: 'var(--font-inter), var(--font-body), sans-serif'
} as const

export const fontSizes = {
  xxs: 'var(--font-size-2xs)',
  xs: 'var(--font-size-xs)',
  sm: 'var(--font-size-sm)',
  base: 'var(--font-size-base)',
  md: 'var(--font-size-md)',
  lg: 'var(--font-size-lg)',
  xl: 'var(--font-size-xl)',
  xxl: 'var(--font-size-2xl)',
  xxxl: 'var(--font-size-3xl)',
  display4xl: 'var(--font-size-4xl)',
  display5xl: 'var(--font-size-5xl)'
} as const

export const lineHeights = {
  tight: 'var(--line-height-tight)',
  snug: 'var(--line-height-snug)',
  normal: 'var(--line-height-normal)',
  relaxed: 'var(--line-height-relaxed)'
} as const

export const letterSpacing = {
  tight: 'var(--letter-spacing-tight)',
  snug: 'var(--letter-spacing-snug)',
  normal: 'var(--letter-spacing-normal)',
  wide: 'var(--letter-spacing-wide)',
  caps: 'var(--letter-spacing-caps)'
} as const

export const fontWeights = {
  normal: 'var(--font-weight-normal)',
  medium: 'var(--font-weight-medium)',
  semibold: 'var(--font-weight-semibold)',
  bold: 'var(--font-weight-bold)',
  extrabold: 'var(--font-weight-extrabold)'
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Layout — valeurs numériques tirées des variables CSS
// ─────────────────────────────────────────────────────────────────────────────

export const layout = {
  toolbarHeight: 56, // --cr-toolbar-height
  sectionPadding: 20, // --cr-section-padding
  sectionVerticalPadding: 12, // --cr-section-vertical-padding
  centeredCardMaxWidth: 680, // --cr-centered-card-max-width
  buttonHeight: 36 // --cr-button-height
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Palettes brutes (accès direct aux couleurs Google si besoin)
// ─────────────────────────────────────────────────────────────────────────────

export const googleBlue = {
  50: 'var(--google-blue-50)',
  100: 'var(--google-blue-100)',
  200: 'var(--google-blue-200)',
  300: 'var(--google-blue-300)',
  400: 'var(--google-blue-400)',
  500: 'var(--google-blue-500)',
  600: 'var(--google-blue-600)',
  700: 'var(--google-blue-700)',
  800: 'var(--google-blue-800)',
  900: 'var(--google-blue-900)'
} as const

export const googleGreen = {
  50: 'var(--google-green-50)',
  200: 'var(--google-green-200)',
  300: 'var(--google-green-300)',
  400: 'var(--google-green-400)',
  500: 'var(--google-green-500)',
  600: 'var(--google-green-600)',
  700: 'var(--google-green-700)',
  800: 'var(--google-green-800)',
  900: 'var(--google-green-900)'
} as const

export const googleGrey = {
  50: 'var(--google-grey-50)',
  100: 'var(--google-grey-100)',
  200: 'var(--google-grey-200)',
  300: 'var(--google-grey-300)',
  400: 'var(--google-grey-400)',
  500: 'var(--google-grey-500)',
  600: 'var(--google-grey-600)',
  700: 'var(--google-grey-700)',
  800: 'var(--google-grey-800)',
  900: 'var(--google-grey-900)'
} as const

export const googleRed = {
  100: 'var(--google-red-100)',
  300: 'var(--google-red-300)',
  500: 'var(--google-red-500)',
  600: 'var(--google-red-600)',
  700: 'var(--google-red-700)'
} as const

export const googleYellow = {
  50: 'var(--google-yellow-50)',
  100: 'var(--google-yellow-100)',
  200: 'var(--google-yellow-200)',
  300: 'var(--google-yellow-300)',
  400: 'var(--google-yellow-400)',
  500: 'var(--google-yellow-500)',
  700: 'var(--google-yellow-700)'
} as const
