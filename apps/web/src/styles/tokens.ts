// ─── Design Tokens — Sales Companion ───────────────────────────────────────
// Palette alignée avec landing.html (dark mode, vert Cameroun)

export const colors = {
  // Surfaces
  bg:      '#0D1117',
  bg2:     '#161B22',
  bg3:     '#21262D',
  bg4:     '#2D333B',

  // Primaire vert Cameroun
  green:   '#1B7A3E',
  greenMid:'#2ea05a',
  greenDark:'#145f2f',
  greenLight:'rgba(27,122,62,0.12)',

  // Accent
  accent:  '#00897B',
  accentLight:'#e0f2f1',

  // Or
  gold:    '#F5A623',
  goldDark:'#c8841a',
  goldLight:'rgba(245,166,35,0.12)',

  // Texte
  text:    '#F0F6FC',
  textMid: '#8B949E',
  textDim: '#484F58',

  // Bordures
  border:  'rgba(255,255,255,0.08)',
  border2: 'rgba(255,255,255,0.15)',

  // États
  success: '#166534',
  successBg:'rgba(27,122,62,0.12)',
  successBorder:'rgba(27,122,62,0.3)',
  warning: '#92400e',
  warningBg:'#fffbeb',
  warningBorder:'#fcd34d',
  danger:  '#991b1b',
  dangerBg:'rgba(239,68,68,0.1)',
  dangerBorder:'rgba(239,68,68,0.3)',
  info:    '#1d4ed8',
  infoBg:  '#eff6ff',
  infoBorder:'#93c5fd',

  // Compat (ancienne palette light — garder pour Badge variants)
  surface: '#161B22',
  border_compat: 'rgba(255,255,255,0.08)',
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
  md:   10,
  lg:   16,
  xl:   20,
  pill: 999,
} as const

export const shadows = {
  sm:  '0 4px 12px rgba(0,0,0,0.3)',
  md:  '0 8px 24px rgba(0,0,0,0.4)',
  lg:  '0 20px 60px rgba(0,0,0,0.5)',
  glow:'0 0 30px rgba(27,122,62,0.25)',
} as const

export const transitions = {
  fast:   '150ms ease',
  normal: '300ms ease',
} as const

export const fonts = {
  sans:  "'Inter','DM Sans',sans-serif",
  display:"'Syne','Inter',sans-serif",
} as const
