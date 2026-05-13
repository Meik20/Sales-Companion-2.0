// ─── Design Tokens — Sales Companion ───────────────────────────────────────
// Toutes les valeurs pointent vers les CSS Variables du theme.css (Deep Blue Tech)
// → modifier une couleur dans theme.css suffit à changer tout le projet.

// ─────────────────────────────────────────────────────────────────────────────
// Références directes aux CSS Variables (utilisables dans les inline styles React)
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // ── Surfaces ──────────────────────────────────────────────────────────────
  bg:       'var(--bg)',
  bg2:      'var(--bg2)',
  bg3:      'var(--bg3)',
  bg4:      'var(--bg4)',
  surface:  'var(--bg2)',

  // ── Texte ─────────────────────────────────────────────────────────────────
  text:     'var(--tx)',
  textMid:  'var(--tx2)',
  textDim:  'var(--tx3)',
  textTitle:'var(--tx)',
  link:     'var(--cr-link-color)',

  // ── Deep Blue Tech Primary (ancien colors.green pour compatibilité) ─────────
  green:      'var(--color-primary)',        // #185FA5
  greenMid:   'var(--color-blue-600)',       // #185FA5
  greenDark:  'var(--color-blue-900)',       // #042C53
  greenLight: 'var(--color-blue-50)',        // #E6F1FB

  // ── Accent Cyan ───────────────────────────────────────────────────────────
  accent:      'var(--color-accent)',
  accentLight: 'var(--color-blue-200)',

  // ── Teal / Secondaire ─────────────────────────────────────────────────────
  gold:      'var(--color-secondary)',
  goldDark:  'var(--color-teal-900)',
  goldLight: 'var(--color-teal-50)',

  // ── Bordures ──────────────────────────────────────────────────────────────
  border:        'var(--bd)',
  border2:       'var(--bd2)',
  border_compat: 'var(--bd)',

  // ── États sémantiques ─────────────────────────────────────────────
  success:       'var(--color-success)',
  successBg:     'var(--color-success-bg)',
  successBorder: 'rgba(5, 118, 66, 0.3)',

  warning:       'var(--color-warning)',
  warningBg:     'var(--color-warning-bg)',
  warningBorder: 'rgba(145, 89, 7, 0.3)',

  danger:        'var(--color-danger)',
  dangerBg:      'var(--color-danger-bg)',
  dangerBorder:  'rgba(204, 16, 22, 0.3)',

  info:          'var(--color-accent)',
  infoBg:        'var(--color-primary-light)',
  infoBorder:    'var(--color-blue-200)',

  // ── Interactifs ───────────────────────────────────────────────────
  hoverBg:  'var(--cr-hover-background-color)',
  activeBg: 'var(--cr-active-background-color)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Ombres — Glass effect
// ─────────────────────────────────────────────────────────────────────────────

export const shadows = {
  sm:   'var(--shadow-glass-light)',
  md:   'var(--shadow-glass-medium)',
  lg:   'var(--shadow-glass-strong)',
  xl:   'var(--shadow-glass-strong)',
  glow: '0 0 30px rgba(24, 95, 165, 0.25)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Rayons
// ─────────────────────────────────────────────────────────────────────────────

export const radius = {
  sm:   4,
  md:   4,
  lg:   4,
  xl:   4,
  pill: 9999,
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
  sans:    "'Geist', sans-serif",
  display: "'Geist', sans-serif",
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
