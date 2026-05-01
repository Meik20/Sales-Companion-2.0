'use client'

import React from 'react'
import { colors, transitions } from '@/styles/tokens'

type Sector = 'btp' | 'tech' | 'agro' | 'transport'

interface ShortcutCardProps {
  sector: Sector
  title: string
  subtitle: string
  onClick?: () => void
}

const sectorConfig: Record<Sector, { bg: string; iconColor: string; icon: React.ReactNode }> = {
  btp: {
    bg: '#FFF3E0', // Orange clair
    iconColor: '#F57F17',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M2 22h20" />
        <path d="M17 22v-4a2 2 0 0 0-2-2h-6a2 2 0 0 0-2 2v4" />
        <path d="M12 16v-6" />
        <path d="M8 10h8" />
        <path d="M12 10V4" />
        <path d="M10 4h4" />
      </svg>
    ),
  },
  tech: {
    bg: '#E3F2FD', // Bleu clair
    iconColor: '#1E88E5',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
        <line x1="8" y1="21" x2="16" y2="21" />
        <line x1="12" y1="17" x2="12" y2="21" />
      </svg>
    ),
  },
  agro: {
    bg: '#E8F5E9', // Vert clair
    iconColor: '#2E7D32',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z" />
        <path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12" />
      </svg>
    ),
  },
  transport: {
    bg: '#F3E5F5', // Violet clair
    iconColor: '#8E24AA',
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect x="2" y="4" width="14" height="12" rx="1" />
        <rect x="16" y="8" width="6" height="8" rx="1" />
        <circle cx="6" cy="18" r="2" />
        <circle cx="18" cy="18" r="2" />
        <path d="M16 8h3l3 4v4" />
      </svg>
    ),
  },
}

export function ShortcutCard({ sector, title, subtitle, onClick }: ShortcutCardProps) {
  const config = sectorConfig[sector]

  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-start',
        gap: 12,
        padding: 16,
        background: colors.bg2,
        border: \`1px solid \${colors.border2}\`,
        borderRadius: 16,
        cursor: 'pointer',
        transition: transitions.fast,
        textAlign: 'left',
        width: '100%',
        boxShadow: '0 2px 4px rgba(0,0,0,0.02)',
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = config.iconColor
        e.currentTarget.style.transform = 'translateY(-2px)'
        e.currentTarget.style.boxShadow = '0 6px 12px rgba(0,0,0,0.06)'
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border2
        e.currentTarget.style.transform = 'translateY(0)'
        e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.02)'
      }}
    >
      <div
        style={{
          width: 40,
          height: 40,
          borderRadius: 10,
          background: config.bg,
          color: config.iconColor,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <div style={{ width: 24, height: 24 }}>
          {config.icon}
        </div>
      </div>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ fontWeight: 700, fontSize: 14, color: colors.text }}>
          {title}
        </span>
        <span style={{ fontSize: 12, color: colors.textMid }}>
          {subtitle}
        </span>
      </div>
    </button>
  )
}
