// ─── Design Tokens — Sales Companion ───────────────────────────────────────
// Toutes les valeurs pointent vers les CSS Variables de globals.css
// → modifier une couleur dans globals.css suffit à changer tout le projet.

// ─────────────────────────────────────────────────────────────────────────────
// Références directes aux CSS Variables (utilisables dans les inline styles React)
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  bg:       'var(--md-background-color)',
  bg2:      'var(--cr-card-background-color)',
  bg3:      'var(--google-grey-100)',
  bg4:      'var(--google-grey-200)',
  surface:  'var(--cr-card-background-color)',

  // ── Texte ─────────────────────────────────────────────────────────────────
  text:     'var(--cr-primary-text-color)',
  textMid:  'var(--cr-secondary-text-color)',
  textDim:  'var(--google-grey-500)',
  textTitle:'var(--cr-title-text-color)',
  link:     'var(--cr-link-color)',

  // ── Vert Cameroun (primary) ───────────────────────────────────────────────
  green:      'var(--google-green-800)',
  greenMid:   'var(--google-green-500)',
  greenDark:  'var(--google-green-900)',
  greenLight: 'var(--google-green-50)',

  // ── Accent ────────────────────────────────────────────────────────────────
  accent:      '#00897B',
  accentLight: 'var(--google-green-50)',

  // ── Or / Avertissement ────────────────────────────────────────────────────
  gold:      'var(--google-yellow-500)',
  goldDark:  'var(--google-yellow-700)',
  goldLight: 'var(--google-yellow-50)',

  // ── Bordures ──────────────────────────────────────────────────────────────
  border:        'var(--cr-separator-color)',
  border2:       'rgba(0,0,0,0.12)',
  border_compat: 'var(--cr-separator-color)',

  // ── États sémantiques ─────────────────────────────────────────────────────
  success:       'var(--google-green-800)',
  successBg:     'var(--google-green-50)',
  successBorder: 'rgba(27,122,62,0.3)',

  warning:       '#FB8C00',
  warningBg:     'var(--google-yellow-50)',
  warningBorder: 'var(--google-yellow-200)',

  danger:        'var(--google-red-500)',
  dangerBg:      'var(--google-red-100)',
  dangerBorder:  'rgba(234,67,53,0.3)',

  info:          'var(--google-blue-600)',
  infoBg:        'var(--google-blue-50)',
  infoBorder:    'var(--google-blue-200)',

  // ── Interactifs ───────────────────────────────────────────────────────────
  hoverBg:  'var(--cr-hover-background-color)',
  activeBg: 'var(--cr-active-background-color)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Ombres — référencent les niveaux d'élévation
// ─────────────────────────────────────────────────────────────────────────────

export const shadows = {
  sm:   'var(--cr-elevation-1)',
  md:   'var(--cr-elevation-2)',
  lg:   'var(--cr-elevation-3)',
  xl:   'var(--cr-elevation-5)',
  glow: '0 0 30px rgba(27,122,62,0.25)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Rayons
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  sm:   6,
  md:   8,    // = --cr-card-border-radius
  lg:   16,
  xl:   20,
  pill: 999,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Espacement
// ─────────────────────────────────────────────────────────────────────────────

export const spacing = {
  xs:   4,
  sm:   8,
  md:   12,
  lg:   16,
  xl:   24,
  xxl:  32,
  xxxl: 48,
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Transitions
// ─────────────────────────────────────────────────────────────────────────────

export const transitions = {
  fast:   '150ms ease',
  normal: '300ms ease',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Typographie
// ─────────────────────────────────────────────────────────────────────────────

export const fonts = {
  /** Body / UI text — matches globals.css body font-family */
  sans:    "'Segoe UI', Tahoma, sans-serif",
  /** Display / headings — same system stack, heavier weight applied at usage site */
  display: "'Segoe UI', Tahoma, sans-serif",
} as const


// ─────────────────────────────────────────────────────────────────────────────
// Layout — valeurs numériques tirées des variables CSS
// ─────────────────────────────────────────────────────────────────────────────

export const layout = {
  toolbarHeight:          56,   // --cr-toolbar-height
  sectionPadding:         20,   // --cr-section-padding
  sectionVerticalPadding: 12,   // --cr-section-vertical-padding
  centeredCardMaxWidth:   680,  // --cr-centered-card-max-width
  buttonHeight:           36,   // --cr-button-height
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Palettes brutes (accès direct aux couleurs Google si besoin)
// ─────────────────────────────────────────────────────────────────────────────

export const googleBlue = {
  50:  'var(--google-blue-50)',
  100: 'var(--google-blue-100)',
  200: 'var(--google-blue-200)',
  300: 'var(--google-blue-300)',
  400: 'var(--google-blue-400)',
  500: 'var(--google-blue-500)',
  600: 'var(--google-blue-600)',
  700: 'var(--google-blue-700)',
  800: 'var(--google-blue-800)',
  900: 'var(--google-blue-900)',
} as const

export const googleGreen = {
  50:  'var(--google-green-50)',
  200: 'var(--google-green-200)',
  300: 'var(--google-green-300)',
  400: 'var(--google-green-400)',
  500: 'var(--google-green-500)',
  600: 'var(--google-green-600)',
  700: 'var(--google-green-700)',
  800: 'var(--google-green-800)',
  900: 'var(--google-green-900)',
} as const

export const googleGrey = {
  50:  'var(--google-grey-50)',
  100: 'var(--google-grey-100)',
  200: 'var(--google-grey-200)',
  300: 'var(--google-grey-300)',
  400: 'var(--google-grey-400)',
  500: 'var(--google-grey-500)',
  600: 'var(--google-grey-600)',
  700: 'var(--google-grey-700)',
  800: 'var(--google-grey-800)',
  900: 'var(--google-grey-900)',
} as const

export const googleRed = {
  100: 'var(--google-red-100)',
  300: 'var(--google-red-300)',
  500: 'var(--google-red-500)',
  600: 'var(--google-red-600)',
  700: 'var(--google-red-700)',
} as const

export const googleYellow = {
  50:  'var(--google-yellow-50)',
  100: 'var(--google-yellow-100)',
  200: 'var(--google-yellow-200)',
  300: 'var(--google-yellow-300)',
  400: 'var(--google-yellow-400)',
  500: 'var(--google-yellow-500)',
  700: 'var(--google-yellow-700)',
} as const
