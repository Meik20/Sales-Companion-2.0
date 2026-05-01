// ─── Design Tokens — Sales Companion ───────────────────────────────────────
// Palette alignée avec landing.html (dark mode, vert Cameroun)

export const colors = {
  // Surfaces
  bg:      '#F5F7FA',
  bg2:     '#FFFFFF',
  bg3:     '#F0F2F5',
  bg4:     '#E8EAED',

  // Primaire vert Cameroun
  green:   '#1B5E20',
  greenMid:'#43A047',
  greenDark:'#0D3311',
  greenLight:'#E8F5E9',

  // Accent
  accent:  '#00897B',
  accentLight:'#e0f2f1',

  // Or
  gold:    '#F9A825',
  goldDark:'#F57F17',
  goldLight:'#FFF8E1',

  // Texte
  text:    '#1A1A2E',
  textMid: '#4A5568',
  textDim: '#9CA3AF',

  // Bordures
  border:  'rgba(0, 0, 0, 0.06)',
  border2: 'rgba(0, 0, 0, 0.12)',

  // États
  success: '#166534',
  successBg:'#E8F5E9',
  successBorder:'rgba(27,122,62,0.3)',
  warning: '#FB8C00',
  warningBg:'#FFF3E0',
  warningBorder:'#fcd34d',
  danger:  '#E53935',
  dangerBg:'#FFEBEE',
  dangerBorder:'rgba(239,68,68,0.3)',
  info:    '#1E88E5',
  infoBg:  '#E3F2FD',
  infoBorder:'#93c5fd',

  // Compat
  surface: '#FFFFFF',
  border_compat: 'rgba(0,0,0,0.06)',
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
