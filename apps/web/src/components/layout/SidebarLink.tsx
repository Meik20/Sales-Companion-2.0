'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { colors } from '@/styles/tokens'
import type { LucideIcon } from 'lucide-react'

type Props = {
  href: string
  label: string
  icon?: LucideIcon
  badge?: number
}

export function SidebarLink({ href, label, icon: Icon, badge }: Props) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '9px 12px',
        borderRadius: 9,
        background: active ? 'rgba(55,138,221,0.12)' : 'transparent',
        color: active ? 'var(--color-accent)' : colors.textMid,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: 'all 200ms ease',
        borderLeft: active ? '2px solid var(--color-accent)' : '2px solid transparent',
        position: 'relative'
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = 'rgba(55,138,221,0.06)'
        if (!active) e.currentTarget.style.color = colors.text
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = 'transparent'
        if (!active) e.currentTarget.style.color = colors.textMid
      }}
    >
      {Icon ? <Icon size={16} strokeWidth={active ? 2.2 : 1.8} style={{ flexShrink: 0 }} /> : null}
      <span style={{ flex: 1 }}>{label}</span>
      {badge != null && badge > 0 ? (
        <span
          style={{
            minWidth: 18,
            height: 18,
            padding: '0 5px',
            borderRadius: 9999,
            background: 'var(--color-accent)',
            color: '#fff',
            fontSize: 10,
            fontWeight: 700,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}
        >
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}
