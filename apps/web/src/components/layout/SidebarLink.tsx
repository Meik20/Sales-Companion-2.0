'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { colors } from '@/styles/tokens'

type Props = {
  href: string
  label: string
  icon?: string
}

export function SidebarLink({ href, label, icon }: Props) {
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
        background: active ? colors.greenLight : 'transparent',
        color: active ? colors.greenMid : colors.textMid,
        textDecoration: 'none',
        fontSize: 13,
        fontWeight: active ? 600 : 400,
        transition: 'all 200ms ease',
        borderLeft: active ? `2px solid ${colors.greenMid}` : '2px solid transparent',
      }}
    >
      {icon ? <span style={{ fontSize: 15, opacity: 0.85 }}>{icon}</span> : null}
      {label}
    </Link>
  )
}
