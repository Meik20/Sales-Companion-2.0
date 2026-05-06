'use client'

import React from 'react'
import { colors, transitions } from '@/styles/tokens'
import { Building2, Monitor, Leaf, Truck, Briefcase } from 'lucide-react'
import { useTranslation } from '@/providers/I18nProvider'

type Sector = 'btp' | 'tech' | 'agro' | 'transport' | 'default'

interface ShortcutCardProps {
  sector?: Sector
  title: string
  subtitle: string
  count?: number
  updatedAt?: string
  onClick?: () => void
}

const sectorConfig: Record<Sector, { icon: React.ReactNode; label: string }> = {
  btp:       { icon: <Building2 size={20} strokeWidth={1.8} />, label: 'BTP & Construction' },
  tech:      { icon: <Monitor   size={20} strokeWidth={1.8} />, label: 'Technologies' },
  agro:      { icon: <Leaf      size={20} strokeWidth={1.8} />, label: 'Agroalimentaire' },
  transport: { icon: <Truck     size={20} strokeWidth={1.8} />, label: 'Transport & Logistique' },
  default:   { icon: <Briefcase size={20} strokeWidth={1.8} />, label: 'Secteur' },
}

// Couleur unique pour tous les secteurs — bleu primaire du thème
const ICON_BG    = 'rgba(55,138,221,0.12)'
const ICON_COLOR = 'var(--color-accent)'
const HOVER_BORDER = 'rgba(55,138,221,0.4)'

export function ShortcutCard({ sector = 'default', title, subtitle, count, updatedAt, onClick }: ShortcutCardProps) {
  const { t } = useTranslation()
  const config = sectorConfig[sector] ?? sectorConfig.default

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 10,
        padding: '14px 16px',
        background: colors.bg2,
        border: `1px solid ${colors.border}`,
        borderRadius: 14,
        cursor: 'pointer',
        transition: transitions.fast,
        textAlign: 'left',
        width: '100%',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = HOVER_BORDER
        e.currentTarget.style.background   = 'rgba(55,138,221,0.05)'
        e.currentTarget.style.transform    = 'translateY(-1px)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border
        e.currentTarget.style.background  = colors.bg2
        e.currentTarget.style.transform   = 'translateY(0)'
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 38, height: 38,
          borderRadius: 9,
          background: ICON_BG,
          color: ICON_COLOR,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        {config.icon}
      </div>

      {/* Text */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, width: '100%' }}>
        <span style={{ fontWeight: 700, fontSize: 13, color: colors.text, lineHeight: 1.3 }}>
          {title}
        </span>
        <span style={{ fontSize: 11, color: colors.textMid }}>
          {subtitle}
        </span>
        {(count != null || updatedAt) && (
          <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 6, fontSize: 10, color: colors.textDim }}>
            {count != null && <span>{count.toLocaleString()} {t('search.companies')}</span>}
            {updatedAt && <span>{t('search.updatedAt')} : {updatedAt}</span>}
          </div>
        )}
      </div>
    </button>
  )
}
