// ─── Design Tokens — Sales Companion ───────────────────────────────────────
// Alignés sur la fiche de style CSS (palette Google + design system --cr-*)

// ─────────────────────────────────────────────────────────────────────────────
// Palette Google
// ─────────────────────────────────────────────────────────────────────────────

export const googleBlue = {
  50:  'rgb(232,240,254)',
  100: 'rgb(210,227,252)',
  200: 'rgb(174,203,250)',
  300: 'rgb(138,180,248)',
  400: 'rgb(102,157,246)',
  500: 'rgb(66,133,244)',
  600: 'rgb(26,115,232)',
  700: 'rgb(25,103,210)',
  800: 'rgb(24,90,188)',
  900: 'rgb(23,78,166)',
} as const

export const googleGreen = {
  50:  'rgb(230,244,234)',
  200: 'rgb(168,218,181)',
  300: 'rgb(129,201,149)',
  400: 'rgb(91,185,116)',
  500: 'rgb(52,168,83)',
  600: 'rgb(30,142,62)',
  700: 'rgb(24,128,56)',
  800: 'rgb(19,115,51)',
  900: 'rgb(13,101,45)',
} as const

export const googleGrey = {
  50:  'rgb(248,249,250)',
  100: 'rgb(241,243,244)',
  200: 'rgb(232,234,237)',
  300: 'rgb(218,220,224)',
  400: 'rgb(189,193,198)',
  500: 'rgb(154,160,166)',
  600: 'rgb(128,134,139)',
  700: 'rgb(95,99,104)',
  800: 'rgb(60,64,67)',
  900: 'rgb(32,33,36)',
} as const

export const googleRed = {
  100: 'rgb(244,199,195)',
  300: 'rgb(242,139,130)',
  500: 'rgb(234,67,53)',
  600: 'rgb(217,48,37)',
  700: 'rgb(197,57,41)',
} as const

export const googleYellow = {
  50:  'rgb(254,247,224)',
  100: 'rgb(254,239,195)',
  200: 'rgb(253,226,147)',
  300: 'rgb(253,214,51)',
  400: 'rgb(252,201,52)',
  500: 'rgb(251,188,4)',
  700: 'rgb(240,147,0)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Design System tokens (--cr-* / --md-*)
// ─────────────────────────────────────────────────────────────────────────────

export const surfaces = {
  background:  googleGrey[50],   // --md-background-color
  card:        'white',          // --cr-card-background-color
  menu:        'white',          // --cr-menu-background-color
} as const

export const textColors = {
  primary:   'rgb(31,31,31)',    // --cr-primary-text-color
  secondary: 'rgb(68,71,70)',    // --cr-secondary-text-color
  title:     'rgb(90,90,90)',    // --cr-title-text-color
  link:      'rgb(11,87,208)',   // --cr-link-color
} as const

export const elevation = {
  1: '0 1px 2px 0 rgba(0,0,0,0.3), 0 1px 3px 1px rgba(0,0,0,0.15)',
  2: '0 1px 2px 0 rgba(0,0,0,0.3), 0 2px 6px 2px rgba(0,0,0,0.15)',
  3: '0 1px 3px 0 rgba(0,0,0,0.3), 0 4px 8px 3px rgba(0,0,0,0.15)',
  4: '0 2px 3px 0 rgba(0,0,0,0.3), 0 6px 10px 4px rgba(0,0,0,0.15)',
  5: '0 4px 4px 0 rgba(0,0,0,0.3), 0 8px 12px 6px rgba(0,0,0,0.15)',
} as const

export const layout = {
  toolbarHeight:         56,
  sectionPadding:        20,
  sectionVerticalPadding:12,
  centeredCardMaxWidth:  680,
  buttonHeight:          36,
} as const

export const borders = {
  hairline:       '1px solid rgba(0,0,0,0.14)',
  separatorColor: 'rgba(0,0,0,0.06)',
  separatorLine:  '1px solid rgba(0,0,0,0.06)',
} as const

export const states = {
  hoverBg:       'rgba(31,31,31,0.08)',
  activeBg:      'rgba(31,31,31,0.12)',
  focusOutline:  'rgb(11,87,208)',
} as const

// ─────────────────────────────────────────────────────────────────────────────
// Alias de rétrocompatibilité (ancienne API colors / shadows / etc.)
// ─────────────────────────────────────────────────────────────────────────────

export const colors = {
  // Surfaces
  bg:      surfaces.background,
  bg2:     surfaces.card,
  bg3:     googleGrey[100],
  bg4:     googleGrey[200],

  // Primaire vert Cameroun (Google Green)
  green:      googleGreen[800],
  greenMid:   googleGreen[500],
  greenDark:  googleGreen[900],
  greenLight: googleGreen[50],

  // Accent
  accent:      '#00897B',
  accentLight: '#e0f2f1',

  // Or (Google Yellow)
  gold:      googleYellow[500],
  goldDark:  googleYellow[700],
  goldLight: googleYellow[50],

  // Texte
  text:    textColors.primary,
  textMid: textColors.secondary,
  textDim: googleGrey[500],

  // Bordures
  border:  borders.separatorColor,
  border2: 'rgba(0,0,0,0.12)',

  // États sémantiques
  success:       googleGreen[800],
  successBg:     googleGreen[50],
  successBorder: 'rgba(27,122,62,0.3)',
  warning:       '#FB8C00',
  warningBg:     googleYellow[50],
  warningBorder: googleYellow[200],
  danger:        googleRed[500],
  dangerBg:      googleRed[100],
  dangerBorder:  'rgba(239,68,68,0.3)',
  info:          googleBlue[600],
  infoBg:        googleBlue[50],
  infoBorder:    googleBlue[200],

  // Compat
  surface:        'white',
  border_compat:  borders.separatorColor,
} as const

export const spacing = {
  xs:  4,
  sm:  8,
  md:  12,
  lg:  16,
  xl:  24,
  xxl: 32,
  xxxl:48,
} as const

export const radius = {
  sm:   6,
  md:   8,   // aligné sur --cr-card-border-radius
  lg:   16,
  xl:   20,
  pill: 999,
} as const

export const shadows = {
  sm:  elevation[1],
  md:  elevation[2],
  lg:  elevation[3],
  xl:  elevation[5],
  glow:'0 0 30px rgba(27,122,62,0.25)',
} as const

export const transitions = {
  fast:   '150ms ease',
  normal: '300ms ease',
} as const

export const fonts = {
  sans:    "'Segoe UI', Tahoma, 'Inter', 'DM Sans', sans-serif",
  display: "'Syne','Inter',sans-serif",
} as const
