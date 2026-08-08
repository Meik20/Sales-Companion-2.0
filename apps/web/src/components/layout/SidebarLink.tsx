'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
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
      className={`group relative flex items-center gap-3 px-3 py-2.5 rounded-lg text-xs md:text-sm font-medium transition-all duration-200 ${
        active
          ? 'bg-primary/10 text-primary font-semibold shadow-2xs'
          : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1.5 bottom-1.5 w-1 rounded-r-full bg-primary shadow-xs" />
      )}
      {Icon ? (
        <Icon
          className={`h-4 w-4 shrink-0 transition-transform group-hover:scale-110 ${
            active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          }`}
          strokeWidth={active ? 2.3 : 1.8}
        />
      ) : null}
      <span className="flex-1 truncate">{label}</span>
      {badge != null && badge > 0 ? (
        <span className="min-w-4 h-4 px-1.5 rounded-full bg-primary text-primary-foreground text-[10px] font-bold inline-flex items-center justify-center shrink-0 shadow-2xs">
          {badge > 99 ? '99+' : badge}
        </span>
      ) : null}
    </Link>
  )
}

