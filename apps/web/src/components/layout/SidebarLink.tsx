'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'

type Props = {
  href: string
  label: string
  icon?: LucideIcon
  badge?: number
  collapsed?: boolean
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void
}

export function SidebarLink({ href, label, icon: Icon, badge, collapsed = false, onClick }: Props) {
  const pathname = usePathname()
  const active = pathname === href || (href !== '/' && pathname.startsWith(href))

  return (
    <Link
      href={href}
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`group relative flex items-center ${
        collapsed ? 'justify-center px-2 py-2.5' : 'gap-3 px-3 py-2.5'
      } rounded-lg text-xs md:text-sm font-medium transition-all duration-150 ease-standard ${
        active
          ? 'bg-primary/[0.08] text-primary font-semibold'
          : 'text-muted-foreground hover:bg-secondary/70 hover:text-foreground'
      }`}
    >
      {active && (
        <span className="absolute left-0 top-1 bottom-1 w-[3px] rounded-r-full bg-primary" />
      )}
      {Icon ? (
        <Icon
          size={18}
          strokeWidth={1.75}
          className={`shrink-0 transition-transform duration-150 group-hover:scale-105 ${
            active ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'
          }`}
        />
      ) : null}
      {!collapsed && (
        <>
          <span className="flex-1 truncate">{label}</span>
          {badge != null && badge > 0 ? (
            <span className="min-w-5 h-5 px-1.5 rounded-full bg-secondary border border-border/70 text-muted-foreground text-[11px] font-semibold inline-flex items-center justify-center shrink-0">
              {badge > 99 ? '99+' : badge}
            </span>
          ) : null}
        </>
      )}
    </Link>
  )
}
