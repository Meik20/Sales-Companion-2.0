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

const sectorConfig: Record<Sector, { icon: React.ReactNode; label: string; color: string; bg: string }> = {
  btp:       { icon: <Building2 size={16} strokeWidth={2} />, label: 'BTP & Construction',    color: '#f97316', bg: 'rgba(249,115,22,0.10)'  },
  tech:      { icon: <Monitor   size={16} strokeWidth={2} />, label: 'Technologies',           color: '#3b82f6', bg: 'rgba(59,130,246,0.10)'  },
  agro:      { icon: <Leaf      size={16} strokeWidth={2} />, label: 'Agroalimentaire',        color: '#22c55e', bg: 'rgba(34,197,94,0.10)'   },
  transport: { icon: <Truck     size={16} strokeWidth={2} />, label: 'Transport & Logistique', color: '#a855f7', bg: 'rgba(168,85,247,0.10)'  },
  default:   { icon: <Briefcase size={16} strokeWidth={2} />, label: 'Secteur',                color: '#64748b', bg: 'rgba(100,116,139,0.10)' }
}

export function ShortcutCard({
  sector = 'default',
  title,
  subtitle,
  count,
  updatedAt,
  onClick
}: ShortcutCardProps) {
  const { t } = useTranslation()
  const cfg = sectorConfig[sector] ?? sectorConfig.default

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        padding: '10px 12px',
        background: 'var(--bg2)',
        border: '1px solid var(--bd)',
        borderLeft: `3px solid ${cfg.color}`,
        borderRadius: 10,
        cursor: 'pointer',
        transition: `all ${transitions.fast}`,
        textAlign: 'left',
        width: '100%',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = cfg.bg
        e.currentTarget.style.borderColor = cfg.color
        e.currentTarget.style.borderLeftColor = cfg.color
        e.currentTarget.style.transform = 'translateY(-1px)'
        e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,0,0,0.10)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'var(--bg2)'
        e.currentTarget.style.borderColor = 'var(--bd)'
        e.currentTarget.style.borderLeftColor = cfg.color
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 1px 4px rgba(0,0,0,0.06)'
      }}
    >
      {/* Icône colorée par secteur */}
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: cfg.bg,
          color: cfg.color,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}
      >
        {cfg.icon}
      </div>

      {/* Texte */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 1, minWidth: 0, flex: 1 }}>
        <span
          style={{
            fontWeight: 600,
            fontSize: 12.5,
            color: colors.text,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {title}
        </span>
        <span
          style={{
            fontSize: 11,
            color: colors.textMid,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis'
          }}
        >
          {subtitle}
        </span>
        {(count != null || updatedAt) && (
          <div style={{ display: 'flex', gap: 8, marginTop: 2, fontSize: 10, color: colors.textDim }}>
            {count != null && (
              <span>
                {count.toLocaleString()} {t('search.companies')}
              </span>
            )}
            {updatedAt && (
              <span>
                {t('search.updatedAt')} : {updatedAt}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Flèche indicatrice */}
      <svg
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke={cfg.color}
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        style={{ flexShrink: 0, opacity: 0.6 }}
      >
        <polyline points="9 18 15 12 9 6" />
      </svg>
    </button>
  )
}
